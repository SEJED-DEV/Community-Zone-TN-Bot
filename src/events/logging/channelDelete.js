const { AuditLogEvent } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'channelDelete',
  once: false,
  async execute(client, channel) {
    if (!channel.guild) return;
    const guild = channel.guild;
    const logChannelId = config.logChannels.channelDeleted;

    let executor = 'Unknown';
    try {
      const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
      const entry = auditLogs.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp < 5000)) {
        executor = entry.executor;
      }
    } catch (e) {}

    const fields = [
      { name: 'Channel Name', value: channel.name, inline: true },
      { name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
      { name: 'Executor', value: executor.tag || executor, inline: false }
    ];

    await logger.error(client, '🗑️ Channel Deleted', fields, logChannelId);
  }
};
