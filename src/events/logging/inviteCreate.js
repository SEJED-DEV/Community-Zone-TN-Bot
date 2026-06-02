const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'inviteCreate',
  once: false,
  async execute(client, invite) {
    const logChannels = config.logChannels;
    const fields = [
      { name: 'Code', value: `\`${invite.code}\``, inline: true },
      { name: 'Creator', value: invite.inviter ? `<@${invite.inviter.id}>` : 'Unknown', inline: true },
      { name: 'Expires At', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never', inline: true }
    ];
    await logger.info(client, '🎫 Invite Created', fields, logChannels.serversInvites);

    // Update invite tracker cache
    const inviteTracker = require('../../managers/inviteTracker');
    await inviteTracker.updateCache(invite);
  }
};
