const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageDelete',
  once: false,
  async execute(client, message) {
    if (message.partial) return; // Ignore uncached messages to prevent crash/incomplete logs
    if (!message.author || message.author.bot) return; // Ignore bot deleted messages

    const attachments = message.attachments.size > 0 
      ? message.attachments.map(att => `[${att.name}](${att.url})`).join('\n') 
      : 'None';

    const fields = [
      { name: '👤 Author', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
      { name: '📁 Channel', value: `<#${message.channelId}> (\`#${message.channel.name}\`)`, inline: true },
      { name: '📝 Deleted Content', value: message.content ? `\`\`\`${message.content.substring(0, 1000)}\`\`\`` : '*No text content (possibly an embed or attachment)*', inline: false }
    ];

    if (message.attachments.size > 0) {
      fields.push({ name: '📎 Attachments', value: attachments, inline: false });
    }

    await logger.log(
      client,
      '🗑️ Message Deleted',
      fields,
      config.colors.logging.messageDelete,
      message.author.displayAvatarURL({ dynamic: true })
    );
  }
};
