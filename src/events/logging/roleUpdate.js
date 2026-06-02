const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'roleUpdate',
  once: false,
  async execute(client, oldRole, newRole) {
    const guild = newRole.guild;
    const logChannelId = config.logChannels.roleUpdated;

    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`Name: \`${oldRole.name}\` -> \`${newRole.name}\``);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`Color: \`${oldRole.hexColor}\` -> \`${newRole.hexColor}\``);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('Permissions Updated');

    if (changes.length === 0) return;

    let executor = 'Unknown';
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    const fields = [
      { name: 'Role', value: `<@&${newRole.id}> (\`${newRole.id}\`)`, inline: false },
      { name: 'Changes', value: changes.join('\n'), inline: false },
      { name: 'Executor', value: executor.tag || executor, inline: false }
    ];

    await logger.info(client, '📝 Role Updated', fields, logChannelId);
  }
};
