const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, member) {
    const guild = member.guild;
    const logChannels = config.logChannels;

    // 1. Basic Join Log
    const fields = [
      { name: 'Member', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
    ];
    await logger.success(client, '📥 Member Joined', fields, logChannels.memberJoined);

    // 2. Invite Logger
    const inviteTracker = require('../../managers/inviteTracker');
    const usedInvite = await inviteTracker.findUsedInvite(member);

    try {
      const inviteLoggerChannel = await guild.channels.fetch(logChannels.inviteLogger).catch(() => null);
      if (inviteLoggerChannel && inviteLoggerChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('📥 Member Joined')
          .setColor(0x10B981)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '👤 Member', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
            { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
            { name: '📅 Discord Join', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
          )
          .setTimestamp();

        if (usedInvite) {
          embed.addFields(
            { name: '🎫 Invite Code', value: `\`${usedInvite.code}\``, inline: true },
            { name: '👤 Inviter', value: usedInvite.inviter ? `<@${usedInvite.inviter.id}> (\`${usedInvite.inviter.tag}\`)` : 'Unknown', inline: true },
            { name: '📈 Uses', value: `\`${usedInvite.uses}\``, inline: true }
          );
        } else {
          embed.addFields({ name: '🎫 Invite', value: 'Could not track invite (likely Vanity URL or temporary).', inline: false });
        }

        await inviteLoggerChannel.send({ embeds: [embed] });
      }
    } catch (e) {
      console.error('[INVITE LOG ERROR]', e);
    }
  }
};
