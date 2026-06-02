const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'channelUpdate',
  once: false,
  async execute(client, oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const guild = newChannel.guild;
    const logChannelId = config.logChannels.channelUpdated;

    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`Name: \`${oldChannel.name}\` -> \`${newChannel.name}\``);
    if (oldChannel.parentId !== newChannel.parentId) changes.push(`Category: <#${oldChannel.parentId}> -> <#${newChannel.parentId}>`);

    let executor = 'Unknown';
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    // Check for Permission Updates separately
    let permLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelOverwriteUpdate }).catch(() => null);
    if (permLogs && permLogs.entries.first() && (Date.now() - permLogs.entries.first().createdTimestamp < 5000)) {
       const fields = [
        { name: 'Channel', value: `<#${newChannel.id}>`, inline: true },
        { name: 'Action', value: 'Permissions Updated', inline: true },
        { name: 'Executor', value: permLogs.entries.first().executor.tag, inline: false }
      ];
      await logger.warning(client, '🔐 Channel Permissions Updated', fields, config.logChannels.channelPermissionsUpdated);
    }

    if (changes.length === 0) return;

    const fields = [
      { name: 'Channel', value: `<#${newChannel.id}>`, inline: true },
      { name: 'Changes', value: changes.join('\n'), inline: false },
      { name: 'Executor', value: executor.tag || executor, inline: false }
    ];

    await logger.info(client, '📁 Channel Updated', fields, logChannelId);
  }
};
