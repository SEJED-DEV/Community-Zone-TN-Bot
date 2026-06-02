const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'roleCreate',
  once: false,
  async execute(client, role) {
    const guild = role.guild;
    const logChannelId = config.logChannels.roleCreated;

    // Fetch executor from audit logs
    let executor = 'Unknown';
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    const fields = [
      { name: 'Role Name', value: role.name, inline: true },
      { name: 'Role ID', value: `\`${role.id}\``, inline: true },
      { name: 'Color', value: role.hexColor, inline: true },
      { name: 'Executor', value: executor.tag || executor, inline: false }
    ];

    await logger.success(client, '🆕 Role Created', fields, logChannelId);
  }
};
