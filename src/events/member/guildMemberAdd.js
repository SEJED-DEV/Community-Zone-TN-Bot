/**
 * guildMemberAdd.js
 * Applies the server tag prefix to new members when they join the server.
 * If the tag is disabled (empty string in settings), does nothing.
 */
const { applyPrefix, getPrefix } = require('../../utils/prefixManager');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, member) {
    if (member.user.bot) return;

    // If tag is disabled, do nothing
    const currentTag = getPrefix();
    if (!currentTag) return;

    console.log(`[PREFIX] New member joined: ${member.user.tag} — applying tag: "${currentTag}"`);
    await applyPrefix(member);
  }
};
