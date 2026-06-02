const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'roleDelete',
  once: false,
  async execute(client, role) {
    const guild = role.guild;
    const logChannelId = config.logChannels.roleDeleted;

    let executor = 'Unknown';
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    const fields = [
      { name: 'Role Name', value: role.name, inline: true },
      { name: 'Role ID', value: `\`${role.id}\``, inline: true },
      { name: 'Executor', value: executor.tag || executor, inline: false }
    ];

    await logger.error(client, '🗑️ Role Deleted', fields, logChannelId);
  }
};
