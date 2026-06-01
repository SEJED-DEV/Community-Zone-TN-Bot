const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageUpdate',
  once: false,
  async execute(client, oldMessage, newMessage) {
    if (oldMessage.partial || newMessage.partial) return;
    if (!oldMessage.author || oldMessage.author.bot) return;

    // Ignore link previews embedding or pin changes where content is identical
    if (oldMessage.content === newMessage.content) return;

    const fields = [
      { name: '👤 Author', value: `${newMessage.author.tag} (<@${newMessage.author.id}>)`, inline: true },
      { name: '📁 Channel', value: `<#${newMessage.channelId}> (\`#${newMessage.channel.name}\`)`, inline: true },
      { name: '✏️ Before Edit', value: oldMessage.content ? `\`\`\`${oldMessage.content.substring(0, 1000)}\`\`\`` : '*No content*', inline: false },
      { name: '✏️ After Edit', value: newMessage.content ? `\`\`\`${newMessage.content.substring(0, 1000)}\`\`\`` : '*No content*', inline: false },
      { name: '🔗 Jump To Message', value: `[Click Here to Jump](${newMessage.url})`, inline: false }
    ];

    await logger.log(
      client,
      '📝 Message Edited',
      fields,
      config.colors.logging.messageUpdate,
      newMessage.author.displayAvatarURL({ dynamic: true })
    );
  }
};
