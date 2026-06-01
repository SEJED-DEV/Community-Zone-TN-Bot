const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(client, member) {
    const joinedAtSec = member.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;
    const joinedStr = joinedAtSec 
      ? `<t:${joinedAtSec}:F> (<t:${joinedAtSec}:R>)` 
      : 'Unknown';

    // Roles they had
    const rolesList = member.roles.cache
      .filter(role => role.id !== member.guild.roles.everyone.id)
      .map(role => `<@&${role.id}>`)
      .join(', ') || 'None';

    const fields = [
      { name: '👤 Member Left', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
      { name: '🆔 User ID', value: `\`${member.id}\``, inline: true },
      { name: '📥 Joined Server', value: joinedStr, inline: false },
      { name: '🎭 Roles Retained', value: rolesList, inline: false }
    ];

    await logger.log(
      client,
      '📤 Member Left Server',
      fields,
      config.colors.logging.memberLeave,
      member.user.displayAvatarURL({ dynamic: true })
    );
  }
};
