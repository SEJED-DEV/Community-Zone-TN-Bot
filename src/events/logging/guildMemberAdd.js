const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, member) {
    const accountCreated = Math.floor(member.user.createdAt.getTime() / 1000);
    
    // Check if account is fresh (younger than 7 days) to warn moderators
    const ageDays = (Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshWarning = ageDays < 7 ? '🚨 **New Account (Less than 7 days old!)**' : '✅ Standard Account';

    const fields = [
      { name: '👤 Member Joined', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
      { name: '🆔 User ID', value: `\`${member.id}\``, inline: true },
      { name: '📅 Account Created', value: `<t:${accountCreated}:F> (<t:${accountCreated}:R>)`, inline: false },
      { name: '🛡️ Account Status', value: freshWarning, inline: false }
    ];

    await logger.log(
      client,
      '📥 Member Joined Server',
      fields,
      config.colors.logging.memberJoin,
      member.user.displayAvatarURL({ dynamic: true })
    );
  }
};
