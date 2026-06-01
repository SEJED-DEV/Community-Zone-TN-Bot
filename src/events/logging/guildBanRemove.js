const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildBanRemove',
  once: false,
  async execute(client, ban) {
    const user = ban.user;

    const fields = [
      { name: '👤 User Unbanned', value: `${user.tag} (<@${user.id}>)`, inline: true },
      { name: '🆔 User ID', value: `\`${user.id}\``, inline: true }
    ];

    await logger.log(
      client,
      '🔓 Member Ban Lifted',
      fields,
      config.colors.logging.moderation,
      user.displayAvatarURL({ dynamic: true })
    );
  }
};
