const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'inviteDelete',
  once: false,
  async execute(client, invite) {
    const logChannels = config.logChannels;
    const fields = [
      { name: 'Code', value: `\`${invite.code}\``, inline: true },
      { name: 'Channel', value: `<#${invite.channelId}>`, inline: true }
    ];
    await logger.error(client, '🗑️ Invite Deleted', fields, logChannels.serversInvites);

    // Update invite tracker cache
    const inviteTracker = require('../../managers/inviteTracker');
    await inviteTracker.removeFromCache(invite);
  }
};
