const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildBanRemove',
  once: false,
  async execute(client, ban) {
    const logChannelId = config.logChannels.memberUnbanned;

    const fields = [
      { name: 'User', value: `<@${ban.user.id}> (\`${ban.user.tag}\`)`, inline: true },
      { name: 'User ID', value: `\`${ban.user.id}\``, inline: true }
    ];

    await logger.success(client, '🔓 Member Unbanned', fields, logChannelId);
  }
};
