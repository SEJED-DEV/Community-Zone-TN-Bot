const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'threadCreate',
  once: false,
  async execute(client, thread) {
    const logChannelId = config.logChannels.threadCreated;

    let executor = 'Unknown';
    try {
      const auditLogs = await thread.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ThreadCreate });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    const fields = [
      { name: 'Thread', value: `<#${thread.id}> (\`${thread.name}\`)`, inline: true },
      { name: 'Parent Channel', value: `<#${thread.parentId}>`, inline: true },
      { name: 'Executor', value: executor.tag || executor, inline: false }
    ];

    await logger.success(client, '🧶 Thread Created', fields, logChannelId);
  }
};
