const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageUpdate',
  once: false,
  async execute(client, oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const logChannelId = config.logChannels.messageEdited;

    const fields = [
      { name: 'Author', value: `<@${newMessage.author.id}>`, inline: true },
      { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
      { name: 'Before', value: oldMessage.content || '*(No content)*', inline: false },
      { name: 'After', value: newMessage.content || '*(No content)*', inline: false },
      { name: 'Jump', value: `[Go to message](${newMessage.url})`, inline: false }
    ];

    await logger.info(client, '📝 Message Edited', fields, logChannelId);
  }
};
