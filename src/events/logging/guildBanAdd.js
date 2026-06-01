const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildBanAdd',
  once: false,
  async execute(client, ban) {
    const user = ban.user;
    const reason = ban.reason || 'No reason provided';

    const fields = [
      { name: '👤 User Banned', value: `${user.tag} (<@${user.id}>)`, inline: true },
      { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
      { name: '📜 Reason', value: `\`\`\`${reason}\`\`\``, inline: false }
    ];

    await logger.log(
      client,
      '🔨 Member Banned From Server',
      fields,
      config.colors.logging.moderation,
      user.displayAvatarURL({ dynamic: true })
    );
  }
};
