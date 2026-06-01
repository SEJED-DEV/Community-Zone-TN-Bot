const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberUpdate',
  once: false,
  async execute(client, oldMember, newMember) {
    const fields = [
      { name: '👤 Member', value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: true },
      { name: '🆔 User ID', value: `\`${newMember.id}\``, inline: true }
    ];

    let actionTitle = '';
    let shouldLog = false;

    // ----------------------------------------
    // 1. Role Change Logging
    // ----------------------------------------
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    if (oldRoles.size !== newRoles.size) {
      const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
      const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

      if (addedRoles.size > 0) {
        actionTitle = '🎭 Roles Added';
        fields.push({
          name: '➕ Added Roles',
          value: addedRoles.map(role => `<@&${role.id}> (${role.name})`).join('\n'),
          inline: false
        });
        shouldLog = true;
      }

      if (removedRoles.size > 0) {
        actionTitle = '🎭 Roles Removed';
        fields.push({
          name: '➖ Removed Roles',
          value: removedRoles.map(role => `<@&${role.id}> (${role.name})`).join('\n'),
          inline: false
        });
        shouldLog = true;
      }
    }

    // ----------------------------------------
    // 2. Timeout Change Logging
    // ----------------------------------------
    const oldTimeout = oldMember.communicationDisabledUntil;
    const newTimeout = newMember.communicationDisabledUntil;

    if (oldTimeout !== newTimeout) {
      if (newTimeout) {
        actionTitle = '⏳ Member Timed Out';
        const timeoutTimestamp = Math.floor(newTimeout.getTime() / 1000);
        fields.push({
          name: '⏰ Timeout Expiration',
          value: `<t:${timeoutTimestamp}:F> (<t:${timeoutTimestamp}:R>)`,
          inline: false
        });
        shouldLog = true;
      } else {
        actionTitle = '⏳ Member Timeout Removed';
        fields.push({
          name: '⏰ Expiration Status',
          value: 'Timeout lifted by moderator / expired.',
          inline: false
        });
        shouldLog = true;
      }
    }

    // ----------------------------------------
    // 3. Nickname Change Logging
    // ----------------------------------------
    if (oldMember.nickname !== newMember.nickname) {
      actionTitle = '✏️ Nickname Changed';
      fields.push({ name: 'Before nickname', value: oldMember.nickname ? `\`${oldMember.nickname}\`` : '*No Nickname*', inline: true });
      fields.push({ name: 'After nickname', value: newMember.nickname ? `\`${newMember.nickname}\`` : '*No Nickname*', inline: true });
      shouldLog = true;
    }

    if (shouldLog) {
      await logger.log(
        client,
        actionTitle,
        fields,
        config.colors.logging.roles,
        newMember.user.displayAvatarURL({ dynamic: true })
      );
    }
  }
};
