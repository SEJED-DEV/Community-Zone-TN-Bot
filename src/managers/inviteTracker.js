const { Collection } = require('discord.js');

const invites = new Map(); // guildId -> Map<inviteCode, uses>

module.exports = {
  /**
   * Cache all invites for all guilds the bot is in.
   */
  async init(client) {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const guildInvites = await guild.invites.fetch();
        invites.set(guildId, new Map(guildInvites.map(i => [i.code, i.uses])));
      } catch (e) {
        console.error(`[INVITE TRACKER] Failed to fetch invites for guild ${guildId}:`, e.message);
      }
    }
    console.log(`[INVITE TRACKER] Cached invites for ${invites.size} guilds.`);
  },

  /**
   * Find which invite was used.
   */
  async findUsedInvite(member) {
    const guild = member.guild;
    const cachedGuildInvites = invites.get(guild.id);
    if (!cachedGuildInvites) return null;

    try {
      const currentInvites = await guild.invites.fetch();
      const usedInvite = currentInvites.find(i => {
        const cachedUses = cachedGuildInvites.get(i.code) || 0;
        return i.uses > cachedUses;
      });

      // Update cache
      invites.set(guild.id, new Map(currentInvites.map(i => [i.code, i.uses])));

      return usedInvite || null;
    } catch (e) {
      console.error(`[INVITE TRACKER] Error tracking invite for ${member.user.tag}:`, e.message);
      return null;
    }
  },

  /**
   * Update cache when an invite is created.
   */
  async updateCache(invite) {
    const guildId = invite.guild.id;
    if (!invites.has(guildId)) invites.set(guildId, new Map());
    invites.get(guildId).set(invite.code, invite.uses);
  },

  /**
   * Remove from cache when an invite is deleted.
   */
  async removeFromCache(invite) {
    const guildId = invite.guild.id;
    if (invites.has(guildId)) {
      invites.get(guildId).delete(invite.code);
    }
  }
};
