const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

// Helper to fetch executor of a move/disconnect from audit logs
async function fetchVoiceAuditLogExecutor(guild, actionType, channelId = null) {
  try {
    // Wait a brief moment to ensure the audit log entry has been written by Discord
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch the 5 most recent audit logs of the specified type
    const logs = await guild.fetchAuditLogs({
      limit: 5,
      type: actionType
    });

    const now = Date.now();
    // Find the entry that happened within the last 7 seconds
    const entry = logs.entries.find(e => {
      const isRecent = (now - e.createdTimestamp) < 7000;
      if (!isRecent) return false;
      
      if (actionType === AuditLogEvent.MemberMove && channelId) {
        return e.extra?.channel?.id === channelId;
      }
      
      return true;
    });

    return entry ? entry.executor : null;
  } catch (error) {
    console.error(`[AUDIT LOG ERROR] Failed to fetch voice audit log for type ${actionType}:`, error);
    return null;
  }
}

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(client, oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return; // Ignore bots

    const fields = [
      { name: '👤 Member', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
      { name: '🆔 User ID', value: `\`${member.id}\``, inline: true }
    ];

    let actionTitle = '';
    let shouldLog = false;

    // Join Event
    if (!oldState.channelId && newState.channelId) {
      actionTitle = '🔊 Joined Voice Channel';
      fields.push({ name: '📥 Channel Joined', value: `<#${newState.channelId}> (\`${newState.channel.name}\`)`, inline: false });
      shouldLog = true;
    }
    // Leave Event
    else if (oldState.channelId && !newState.channelId) {
      actionTitle = '🔇 Left Voice Channel';
      fields.push({ name: '📤 Channel Left', value: `<#${oldState.channelId}> (\`${oldState.channel.name}\`)`, inline: false });
      shouldLog = true;

      // Handle staff disconnect tracking
      if (config.trackerLogChannelId) {
        // Run asynchronously without blocking the general logging
        (async () => {
          const executor = await fetchVoiceAuditLogExecutor(oldState.guild, AuditLogEvent.MemberDisconnect);
          if (executor) {
            try {
              const trackerChannel = await client.channels.fetch(config.trackerLogChannelId).catch(() => null);
              if (trackerChannel && trackerChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                  .setTitle('🔇 Member Disconnected by Staff')
                  .setColor(0xEF4444) // Crimson Red (danger / alert style)
                  .addFields(
                    { name: '👤 Target Member', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
                    { name: '🛠️ Staff Member (Executor)', value: `<@${executor.id}> (\`${executor.tag}\`)`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false },
                    { name: '📤 Old Channel', value: `<#${oldState.channelId}> (\`${oldState.channel.name}\`)`, inline: false }
                  )
                  .setThumbnail(executor.displayAvatarURL({ dynamic: true }))
                  .setTimestamp()
                  .setFooter({ text: 'Community Zone • Staff Audit Tracker' });

                await trackerChannel.send({ embeds: [embed] }).catch(err => {
                  console.error('[TRACKER ERROR] Failed to send Disconnect track log:', err);
                });
              }
            } catch (err) {
              console.error('[TRACKER ERROR] Failed to fetch or send to tracker channel:', err);
            }
          }
        })();
      }
    }
    // Move Event
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      actionTitle = '🔀 Moved Voice Channel';
      fields.push({ name: '📤 Old Channel', value: `<#${oldState.channelId}> (\`${oldState.channel.name}\`)`, inline: true });
      fields.push({ name: '📥 New Channel', value: `<#${newState.channelId}> (\`${newState.channel.name}\`)`, inline: true });
      shouldLog = true;

      // Handle staff move tracking
      if (config.trackerLogChannelId) {
        // Run asynchronously without blocking the general logging
        (async () => {
          const executor = await fetchVoiceAuditLogExecutor(newState.guild, AuditLogEvent.MemberMove, newState.channelId);
          if (executor) {
            try {
              const trackerChannel = await client.channels.fetch(config.trackerLogChannelId).catch(() => null);
              if (trackerChannel && trackerChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                  .setTitle('🔀 Member Moved by Staff')
                  .setColor(0xF59E0B) // Sunset Amber (accent / warning style)
                  .addFields(
                    { name: '👤 Target Member', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
                    { name: '🛠️ Staff Member (Executor)', value: `<@${executor.id}> (\`${executor.tag}\`)`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false },
                    { name: '📤 Old Channel', value: `<#${oldState.channelId}> (\`${oldState.channel.name}\`)`, inline: true },
                    { name: '📥 New Channel', value: `<#${newState.channelId}> (\`${newState.channel.name}\`)`, inline: true }
                  )
                  .setThumbnail(executor.displayAvatarURL({ dynamic: true }))
                  .setTimestamp()
                  .setFooter({ text: 'Community Zone • Staff Audit Tracker' });

                await trackerChannel.send({ embeds: [embed] }).catch(err => {
                  console.error('[TRACKER ERROR] Failed to send Move track log:', err);
                });
              }
            } catch (err) {
              console.error('[TRACKER ERROR] Failed to fetch or send to tracker channel:', err);
            }
          }
        })();
      }
    }
    // Server Mute Toggle
    else if (oldState.mute !== newState.mute) {
      actionTitle = newState.mute ? '🎙️ Server Muted Member' : '🎙️ Server Unmuted Member';
      fields.push({ name: '🎙️ Voice Channel', value: `<#${newState.channelId}> (\`${newState.channel.name}\`)`, inline: false });
      shouldLog = true;
    }
    // Server Deafen Toggle
    else if (oldState.deaf !== newState.deaf) {
      actionTitle = newState.deaf ? '🔇 Server Deafened Member' : '🔊 Server Undeafened Member';
      fields.push({ name: '🎙️ Voice Channel', value: `<#${newState.channelId}> (\`${newState.channel.name}\`)`, inline: false });
      shouldLog = true;
    }

    if (shouldLog) {
      await logger.log(
        client,
        actionTitle,
        fields,
        config.colors.logging.voice,
        member.user.displayAvatarURL({ dynamic: true })
      );
    }
  }
};
