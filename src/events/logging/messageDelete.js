const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageDelete',
  once: false,
  async execute(client, message) {
    if (!message.guild || message.author?.bot) return;

    const logChannelId = config.logChannels.messageDeleted;

    const fields = [
      { name: 'Author', value: `<@${message.author.id}>`, inline: true },
      { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      { name: 'Content', value: message.content || '*(No content)*', inline: false }
    ];

    if (message.attachments.size > 0) {
      fields.push({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n'), inline: false });
    }

    await logger.error(client, '🗑️ Message Deleted', fields, logChannelId);
  }
};
