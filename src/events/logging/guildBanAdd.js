const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildBanAdd',
  once: false,
  async execute(client, ban) {
    const logChannelId = config.logChannels.memberBanned;

    const fields = [
      { name: 'User', value: `<@${ban.user.id}> (\`${ban.user.tag}\`)`, inline: true },
      { name: 'User ID', value: `\`${ban.user.id}\``, inline: true },
      { name: 'Reason', value: ban.reason || 'No reason provided', inline: false }
    ];

    await logger.error(client, '🔨 Member Banned', fields, logChannelId);
  }
};
