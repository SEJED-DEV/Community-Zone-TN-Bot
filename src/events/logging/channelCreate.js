const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'channelCreate',
  once: false,
  async execute(client, channel) {
    if (!channel.guild) return;
    const guild = channel.guild;
    const logChannelId = config.logChannels.channelCreated;

    let executor = 'Unknown';
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    const fields = [
      { name: 'Channel', value: `<#${channel.id}> (\`${channel.name}\`)`, inline: true },
      { name: 'Type', value: channel.type.toString(), inline: true },
      { name: 'Executor', value: executor.tag || executor, inline: false }
    ];

    await logger.success(client, '📁 Channel Created', fields, logChannelId);
  }
};
