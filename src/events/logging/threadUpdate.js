const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'threadUpdate',
  once: false,
  async execute(client, oldThread, newThread) {
    const logChannelId = config.logChannels.threadUpdated;
    if (oldThread.name === newThread.name && oldThread.archived === newThread.archived) return;

    let executor = 'Unknown';
    try {
      const auditLogs = await newThread.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ThreadUpdate });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    const fields = [
      { name: 'Thread', value: `<#${newThread.id}>`, inline: true },
      { name: 'Executor', value: executor.tag || executor, inline: true },
      { name: 'Changes', value: oldThread.name !== newThread.name ? `Name: \`${oldThread.name}\` -> \`${newThread.name}\`` : 'Status Changed', inline: false }
    ];

    await logger.info(client, '🧶 Thread Updated', fields, logChannelId);
  }
};
