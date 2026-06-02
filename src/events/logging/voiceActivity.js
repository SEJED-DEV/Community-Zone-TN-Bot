const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(client, oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild;
    const logChannels = config.logChannels;

    // 1. Join
    if (!oldState.channelId && newState.channelId) {
      const fields = [
        { name: 'Member', value: `<@${member.id}>`, inline: true },
        { name: 'Channel', value: `<#${newState.channelId}>`, inline: true }
      ];
      await logger.success(client, '🔊 Joined Voice', fields, logChannels.memberJoinedVoiceChannel);
    }
    // 2. Leave
    else if (oldState.channelId && !newState.channelId) {
      const fields = [
        { name: 'Member', value: `<@${member.id}>`, inline: true },
        { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true }
      ];
      await logger.error(client, '🔇 Left Voice', fields, logChannels.memberLeftVoiceChannel);
    }
    // 3. Switch
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const fields = [
        { name: 'Member', value: `<@${member.id}>`, inline: true },
        { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
        { name: 'To', value: `<#${newState.channelId}>`, inline: true }
      ];
      await logger.info(client, '🔀 Switched Voice', fields, logChannels.memberSwitchedVoice);
    }

    // 4. Mute/Deafen (Server-side)
    if (oldState.mute !== newState.mute || oldState.deaf !== newState.deaf) {
      let executor = 'Unknown';
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
        const entry = auditLogs.entries.first();
        if (entry && (Date.now() - entry.createdTimestamp < 5000) && entry.target.id === member.id) {
          executor = entry.executor;
        }
      } catch (e) {}

      const fields = [
        { name: 'Member', value: `<@${member.id}>`, inline: true },
        { name: 'Channel', value: `<#${newState.channelId}>`, inline: true },
        { name: 'Status', value: `${newState.mute ? '🔇 Muted' : '🔊 Unmuted'} / ${newState.deaf ? '🎧 Deafened' : '🔊 Undeafened'}`, inline: false },
        { name: 'Executor', value: executor.tag || executor, inline: false }
      ];
      await logger.warning(client, '🎙️ Voice State Update', fields, logChannels.voiceStateMuteDeafen);
    }
  }
};
