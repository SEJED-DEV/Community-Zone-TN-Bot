/**
 * guildMemberUpdate.js
 * Fires whenever a member's properties change (roles, nickname, etc.).
 * Re-applies the server tag prefix if a user removes or changes it.
 * If the tag is disabled (empty string), does nothing.
 */
const { hasPrefix, applyPrefix, getPrefix } = require('../../utils/prefixManager');

module.exports = {
  name: 'guildMemberUpdate',
  once: false,
  async execute(client, oldMember, newMember) {
    if (newMember.user.bot) return;
    if (newMember.id === newMember.guild.ownerId) return;

    // If tag is disabled, do nothing
    const currentTag = getPrefix();
    if (!currentTag) return;

    const oldNick = oldMember.nickname;
    const newNick = newMember.nickname;

    // Only react to nickname changes
    if (oldNick === newNick) return;

    // If the new nickname doesn't start with the server tag, enforce it
    if (!hasPrefix(newNick)) {
      console.log(`[PREFIX] ${newMember.user.tag} changed nickname → "${newNick}" — re-applying tag.`);
      await applyPrefix(newMember);
    }
  }
};
