const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberUpdate',
  once: false,
  async execute(client, oldMember, newRoleMember) {
    const guild = newRoleMember.guild;

    // 1. Role Changes
    const addedRoles = newRoleMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newRoleMember.roles.cache.has(role.id));

    if (addedRoles.size > 0) {
      let executor = 'Unknown';
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
        const entry = auditLogs.entries.first();
        if (entry && (Date.now() - entry.createdTimestamp < 5000) && entry.target.id === newRoleMember.id) {
          executor = entry.executor;
        }
      } catch (e) {}

      for (const [id, role] of addedRoles) {
        const fields = [
          { name: 'Member', value: `<@${newRoleMember.id}> (\`${newRoleMember.user.tag}\`)`, inline: true },
          { name: 'Role Given', value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
          { name: 'Executor', value: executor.tag || executor, inline: false }
        ];
        await logger.success(client, '➕ Role Given', fields, config.logChannels.roleGiven);
      }
    }

    if (removedRoles.size > 0) {
      let executor = 'Unknown';
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
        const entry = auditLogs.entries.first();
        if (entry && (Date.now() - entry.createdTimestamp < 5000) && entry.target.id === newRoleMember.id) {
          executor = entry.executor;
        }
      } catch (e) {}

      for (const [id, role] of removedRoles) {
        const fields = [
          { name: 'Member', value: `<@${newRoleMember.id}> (\`${newRoleMember.user.tag}\`)`, inline: true },
          { name: 'Role Removed', value: `<@&${role.id}> (\`${role.name}\`)`, inline: true },
          { name: 'Executor', value: executor.tag || executor, inline: false }
        ];
        await logger.error(client, '➖ Role Removed', fields, config.logChannels.roleRemoved);
      }
    }

    // 2. Nickname Changes
    if (oldMember.nickname !== newRoleMember.nickname) {
      let executor = 'Unknown';
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
        const entry = auditLogs.entries.first();
        if (entry && (Date.now() - entry.createdTimestamp < 5000) && entry.target.id === newRoleMember.id) {
          executor = entry.executor;
        }
      } catch (e) {}

      const fields = [
        { name: 'Member', value: `<@${newRoleMember.id}>`, inline: true },
        { name: 'Old Nickname', value: oldMember.nickname || 'None', inline: true },
        { name: 'New Nickname', value: newRoleMember.nickname || 'None', inline: true },
        { name: 'Executor', value: executor.tag || executor, inline: false }
      ];
      await logger.info(client, '🏷️ Nickname Changed', fields, config.logChannels.nicknameChanged);
    }

    // 3. Timeout Changes
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newRoleMember.communicationDisabledUntilTimestamp;

    if (oldTimeout !== newTimeout) {
      let executor = 'Unknown';
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
        const entry = auditLogs.entries.find(e => e.target.id === newRoleMember.id && e.changes.some(c => c.key === 'communication_disabled_until'));
        if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
          executor = entry.executor;
        }
      } catch (e) {}

      if (newTimeout && (!oldTimeout || newTimeout > oldTimeout)) {
        const fields = [
          { name: 'Member', value: `<@${newRoleMember.id}>`, inline: true },
          { name: 'Duration', value: `<t:${Math.floor(newTimeout / 1000)}:R>`, inline: true },
          { name: 'Executor', value: executor.tag || executor, inline: false }
        ];
        await logger.warning(client, '⏰ Timeout Given', fields, config.logChannels.timeoutGivenRemoved);
      } else if (!newTimeout && oldTimeout) {
        const fields = [
          { name: 'Member', value: `<@${newRoleMember.id}>`, inline: true },
          { name: 'Status', value: 'Timeout Removed', inline: true },
          { name: 'Executor', value: executor.tag || executor, inline: false }
        ];
        await logger.success(client, '🛡️ Timeout Removed', fields, config.logChannels.timeoutGivenRemoved);
      }
    }
  }
};
