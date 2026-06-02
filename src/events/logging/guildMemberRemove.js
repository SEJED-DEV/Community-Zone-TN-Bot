const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(client, member) {
    const guild = member.guild;

    // Check if it was a kick
    let executor = null;
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000) && entry.target.id === member.id) {
        executor = entry.executor;
      }
    } catch (e) {}

    if (executor) {
      const fields = [
        { name: 'Member', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
        { name: 'Executor', value: `<@${executor.id}>`, inline: true }
      ];
      await logger.error(client, '👢 Member Kicked', fields, config.logChannels.memberKicked);
    } else {
      const fields = [
        { name: 'Member', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
        { name: 'Roles', value: member.roles.cache.map(r => r.name).join(', ') || 'None', inline: false }
      ];
      await logger.log(client, '📤 Member Left', fields, config.colors.logging.memberLeave, null, config.logChannels.memberLeft);
    }
  }
};
