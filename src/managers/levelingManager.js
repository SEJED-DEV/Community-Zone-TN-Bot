const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const settingsManager = require('../utils/settingsManager');

const dataDir = path.join(__dirname, '../../data');
const xpDataPath = path.join(dataDir, 'leveling.json');

// ─────────────────────────────────────────────
// MILESTONE ROLE DEFINITIONS (Level → Emoji Name)
// Roles are only assigned at every 5th level.
// Users hold exactly ONE role at a time.
// ─────────────────────────────────────────────
const MILESTONE_ROLES = [
  { level: 5,   emoji: '🚀', name: 'Level 5 🚀'   },
  { level: 10,  emoji: '✨', name: 'Level 10 ✨'  },
  { level: 15,  emoji: '🔥', name: 'Level 15 🔥'  },
  { level: 20,  emoji: '💎', name: 'Level 20 💎'  },
  { level: 25,  emoji: '🏆', name: 'Level 25 🏆'  },
  { level: 30,  emoji: '⚡', name: 'Level 30 ⚡'  },
  { level: 35,  emoji: '🎯', name: 'Level 35 🎯'  },
  { level: 40,  emoji: '👑', name: 'Level 40 👑'  },
  { level: 45,  emoji: '🚀', name: 'Level 45 🚀'  },
  { level: 50,  emoji: '✨', name: 'Level 50 ✨'  },
  { level: 55,  emoji: '🔥', name: 'Level 55 🔥'  },
  { level: 60,  emoji: '💎', name: 'Level 60 💎'  },
  { level: 65,  emoji: '🏆', name: 'Level 65 🏆'  },
  { level: 70,  emoji: '⚡', name: 'Level 70 ⚡'  },
  { level: 75,  emoji: '🎯', name: 'Level 75 🎯'  },
  { level: 80,  emoji: '👑', name: 'Level 80 👑'  },
  { level: 85,  emoji: '🚀', name: 'Level 85 🚀'  },
  { level: 90,  emoji: '✨', name: 'Level 90 ✨'  },
  { level: 95,  emoji: '🔥', name: 'Level 95 🔥'  },
  { level: 100, emoji: '💎', name: 'Level 100 💎' },
  { level: 105, emoji: '🏆', name: 'Level 105 🏆' },
  { level: 110, emoji: '⚡', name: 'Level 110 ⚡' },
  { level: 115, emoji: '🎯', name: 'Level 115 🎯' },
  { level: 120, emoji: '👑', name: 'Level 120 👑' },
  { level: 125, emoji: '🚀', name: 'Level 125 🚀' },
  { level: 130, emoji: '✨', name: 'Level 130 ✨' },
  { level: 135, emoji: '🔥', name: 'Level 135 🔥' },
  { level: 140, emoji: '💎', name: 'Level 140 💎' },
  { level: 145, emoji: '🏆', name: 'Level 145 🏆' },
  { level: 150, emoji: '⚡', name: 'Level 150 ⚡' },
  { level: 155, emoji: '🎯', name: 'Level 155 🎯' },
  { level: 160, emoji: '👑', name: 'Level 160 👑' },
  { level: 165, emoji: '🚀', name: 'Level 165 🚀' },
  { level: 170, emoji: '✨', name: 'Level 170 ✨' },
  { level: 175, emoji: '🔥', name: 'Level 175 🔥' },
  { level: 180, emoji: '💎', name: 'Level 180 💎' },
  { level: 185, emoji: '🏆', name: 'Level 185 🏆' },
  { level: 190, emoji: '⚡', name: 'Level 190 ⚡' },
  { level: 195, emoji: '🎯', name: 'Level 195 🎯' },
  { level: 200, emoji: '👑', name: 'Level 200 👑' },
  { level: 205, emoji: '🚀', name: 'Level 205 🚀' },
  { level: 210, emoji: '✨', name: 'Level 210 ✨' },
  { level: 215, emoji: '🔥', name: 'Level 215 🔥' },
  { level: 220, emoji: '💎', name: 'Level 220 💎' },
  { level: 225, emoji: '🏆', name: 'Level 225 🏆' },
  { level: 230, emoji: '⚡', name: 'Level 230 ⚡' },
  { level: 235, emoji: '🎯', name: 'Level 235 🎯' },
  { level: 240, emoji: '👑', name: 'Level 240 👑' },
  { level: 245, emoji: '🚀', name: 'Level 245 🚀' },
  { level: 250, emoji: '🌟', name: 'Level 250 🌟' },
];

// XP cooldown: prevent spam XP farming (15 seconds between XP gains per user)
const XP_COOLDOWN_MS = 15_000;
// XP awarded per eligible message (random range for natural feel)
const XP_MIN = 15;
const XP_MAX = 25;
// Max level cap
const MAX_LEVEL = 250;

class LevelingManager {
  constructor() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // In-memory XP/level store: { [guildId]: { [userId]: { xp, level, lastMessage } } }
    this._cache = {};
    // Cooldown map: { [guildId_userId]: timestamp }
    this._cooldowns = new Map();
    // Voice minutes tracker for DT rewards
    this._voiceMinutes = new Map();
    // Load persisted data on startup
    this._loadAll();
  }

  // ─── XP Formula ───────────────────────────────────────────
  /**
   * Calculate the total XP required to REACH a given level.
   * Formula: XP = 5 * (level^2) + 50 * level + 100
   * This is the standard MEE6-compatible curve.
   */
  xpForLevel(level) {
    if (level <= 0) return 0;
    return 5 * (level * level) + 50 * level + 100;
  }

  /**
   * Calculate what level a user is at given total accumulated XP.
   */
  levelFromXp(totalXp) {
    let level = 0;
    let accumulatedXp = 0;
    while (level < MAX_LEVEL) {
      const needed = this.xpForLevel(level + 1);
      if (accumulatedXp + needed > totalXp) break;
      accumulatedXp += needed;
      level++;
    }
    return level;
  }

  /**
   * Returns how much XP the user has within their current level (progress bar use).
   */
  xpProgress(totalXp) {
    let level = 0;
    let accumulatedXp = 0;
    while (level < MAX_LEVEL) {
      const needed = this.xpForLevel(level + 1);
      if (accumulatedXp + needed > totalXp) {
        return {
          currentLevelXp: totalXp - accumulatedXp,
          nextLevelXp: needed,
          level,
        };
      }
      accumulatedXp += needed;
      level++;
    }
    return { currentLevelXp: 0, nextLevelXp: 0, level: MAX_LEVEL };
  }

  // ─── Data Persistence ──────────────────────────────────────
  _loadAll() {
    if (fs.existsSync(xpDataPath)) {
      try {
        this._cache = JSON.parse(fs.readFileSync(xpDataPath, 'utf8'));
      } catch (e) {
        console.error('[LEVELING] Failed to parse leveling.json:', e);
        this._cache = {};
      }
    }
  }

  _saveAll() {
    try {
      fs.writeFileSync(xpDataPath, JSON.stringify(this._cache, null, 2), 'utf8');
    } catch (e) {
      console.error('[LEVELING] Failed to save leveling.json:', e);
    }
  }

  _getGuild(guildId) {
    if (!this._cache[guildId]) this._cache[guildId] = {};
    return this._cache[guildId];
  }

  _getUser(guildId, userId) {
    const guild = this._getGuild(guildId);
    if (!guild[userId]) {
      guild[userId] = { xp: 0, level: 0 };
    } else {
      // Auto-heal missing or undefined level fields dynamically
      if (guild[userId].level === undefined || guild[userId].level === null) {
        guild[userId].level = this.levelFromXp(guild[userId].xp);
      }
    }
    return guild[userId];
  }

  // ─── Settings ──────────────────────────────────────────────
  getLevelChannelId(guildId) {
    const settings = settingsManager.loadSettings();
    return settings.levelUpChannelId || config.levelUpChannelId || null;
  }

  setLevelChannelId(guildId, channelId) {
    settingsManager.saveSettings({ levelUpChannelId: channelId });
  }

  getLevelingEnabled(guildId) {
    const settings = settingsManager.loadSettings();
    return settings.levelingEnabled !== false;
  }

  setLevelingEnabled(guildId, enabled) {
    settingsManager.saveSettings({ levelingEnabled: enabled });
  }

  // ─── Core XP Award ────────────────────────────────────────
  /**
   * Award XP to a user. Returns level-up data if they leveled up, else null.
   * Respects cooldown to prevent spam farming.
   */
  awardXp(guildId, userId) {
    if (!this.getLevelingEnabled(guildId)) return null;

    const cooldownKey = `${guildId}_${userId}`;
    const now = Date.now();
    const lastAwarded = this._cooldowns.get(cooldownKey) || 0;

    if (now - lastAwarded < XP_COOLDOWN_MS) return null;
    this._cooldowns.set(cooldownKey, now);

    const userData = this._getUser(guildId, userId);
    
    // Apply dynamic XP boost multiplier if active
    let baseGain = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
    let multiplier = 1;
    try {
      const economy = require('./economyManager');
      multiplier = economy.getXpMultiplier(guildId, userId);
    } catch (e) {
      console.error('[LEVELING] Failed to resolve economy multiplier:', e);
    }
    const xpGain = Math.round(baseGain * multiplier);
    
    // Always compute oldLevel dynamically from current XP to avoid stale database values
    const oldLevel = this.levelFromXp(userData.xp);

    userData.xp += xpGain;
    const newLevel = this.levelFromXp(userData.xp);
    
    // Sync level property
    userData.level = newLevel;

    let levelsGained = null;

    if (newLevel > oldLevel) {
      levelsGained = {
        oldLevel,
        newLevel,
        totalXp: userData.xp,
        milestone: this.getMilestoneForLevel(newLevel),
        // Also collect any intermediate milestones passed in one jump (rare but safe)
        milestonesReached: this.getMilestonesBetween(oldLevel, newLevel),
      };
    }

    // Save asynchronously-ish (every write is synchronous but fast for JSON)
    this._saveAll();
    return levelsGained;
  }

  // ─── Milestone Helpers ─────────────────────────────────────
  /**
   * Returns the HIGHEST milestone at or below a given level, or null.
   */
  getMilestoneForLevel(level) {
    let best = null;
    for (const m of MILESTONE_ROLES) {
      if (m.level <= level) best = m;
    }
    return best;
  }

  /**
   * Returns all milestone definitions.
   */
  getAllMilestones() {
    return MILESTONE_ROLES;
  }

  /**
   * Returns milestones that were newly crossed going from oldLevel to newLevel.
   */
  getMilestonesBetween(oldLevel, newLevel) {
    return MILESTONE_ROLES.filter(m => m.level > oldLevel && m.level <= newLevel);
  }

  // ─── Role Management ──────────────────────────────────────
  /**
   * Finds a role in the guild by its exact name from the milestone list.
   * Returns the Role object or null.
   */
  async findMilestoneRole(guild, milestoneName) {
    await guild.roles.fetch().catch(() => null);
    return guild.roles.cache.find(r => r.name === milestoneName) || null;
  }

  /**
   * Removes ALL level milestone roles from a member, then assigns the new one.
   * This guarantees the user always has exactly one level role.
   */
  async updateMemberRole(member, newMilestone) {
    try {
      const guild = member.guild;
      // Collect all milestone role IDs this member currently has
      const rolesToRemove = [];
      for (const m of MILESTONE_ROLES) {
        const role = await this.findMilestoneRole(guild, m.name);
        if (role && member.roles.cache.has(role.id)) {
          rolesToRemove.push(role);
        }
      }

      // Remove old milestone roles
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove, 'Level-up: removing old milestone role');
      }

      // Assign new milestone role
      if (newMilestone) {
        let newRole = await this.findMilestoneRole(guild, newMilestone.name);
        if (!newRole) {
          try {
            console.log(`[LEVELING] Role "${newMilestone.name}" not found in server. Creating automatically...`);
            newRole = await guild.roles.create({
              name: newMilestone.name,
              reason: `Auto-created milestone role for Level ${newMilestone.level}`,
            });
          } catch (createErr) {
            console.error(`[LEVELING] Failed to auto-create milestone role "${newMilestone.name}":`, createErr);
          }
        }

        if (newRole) {
          await member.roles.add(newRole, `Level-up: reached Level ${newMilestone.level}`);
          return newRole;
        }
      }
    } catch (err) {
      console.error('[LEVELING] Failed to update member roles:', err);
    }
    return null;
  }

  // ─── Leaderboard ──────────────────────────────────────────
  /**
   * Returns top N users for a guild sorted by XP descending.
   */
  getLeaderboard(guildId, limit = 10) {
    const guild = this._getGuild(guildId);
    return Object.entries(guild)
      .map(([userId, data]) => ({
        userId,
        xp: data.xp,
        level: this.levelFromXp(data.xp)
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
  }

  /**
   * Returns the rank of a user in a guild (1-indexed).
   */
  getUserRank(guildId, userId) {
    const guild = this._getGuild(guildId);
    const sorted = Object.entries(guild)
      .map(([uid, data]) => ({ userId: uid, xp: data.xp }))
      .sort((a, b) => b.xp - a.xp);
    const rank = sorted.findIndex(u => u.userId === userId);
    return rank === -1 ? null : rank + 1;
  }

  /**
   * Returns user data (xp, level) or null if not found.
   */
  getUserData(guildId, userId) {
    const guild = this._getGuild(guildId);
    const data = guild[userId];
    if (!data) return null;
    return {
      ...data,
      level: this.levelFromXp(data.xp)
    };
  }

  /**
   * Manually set a user's XP (admin use).
   */
  setUserXp(guildId, userId, xp) {
    const userData = this._getUser(guildId, userId);
    userData.xp = Math.max(0, xp);
    userData.level = this.levelFromXp(userData.xp);
    this._saveAll();
    return userData;
  }

  /**
   * Reset a user's XP and level.
   */
  resetUser(guildId, userId) {
    const guild = this._getGuild(guildId);
    delete guild[userId];
    this._saveAll();
  }

  // ─── Voice XP System ───────────────────────────────────────
  /**
   * Start the voice duration XP periodic check ticker.
   */
  startVoiceXpTicker(client) {
    if (this._voiceTicker) clearInterval(this._voiceTicker);

    // Ticker runs every 1 minute (60,000 ms)
    this._voiceTicker = setInterval(async () => {
      try {
        await this._processVoiceXp(client);
      } catch (err) {
        console.error('[LEVELING] Error in Voice XP ticker:', err);
      }
    }, 60_000);

    console.log('[LEVELING] Voice XP background ticker started (checking every 60s).');
  }

  /**
   * Processes XP and DT for all eligible voice users across all guilds.
   */
  async _processVoiceXp(client) {
    const economy = require('./economyManager');
    const { fireMilestoneLog } = require('../utils/walletLog');

    for (const guild of client.guilds.cache.values()) {
      const levelingEnabled = this.getLevelingEnabled(guild.id);

      // Scan all voice states in this guild
      const voiceStates = guild.voiceStates.cache;
      
      for (const state of voiceStates.values()) {
        const member = state.member;
        if (!member || member.user.bot) continue;

        // Condition for Voice rewards:
        // 1. Must be in a voice channel
        // 2. Not in the "Join to Create" trigger channel
        if (
          state.channelId &&
          state.channelId !== config.triggerChannelId
        ) {
          // ── A. Award Voice XP (only if leveling is enabled) ──
          if (levelingEnabled) {
            const xpGain = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
            await this.awardVoiceXp(guild, member, xpGain);
          }

          // ── B. Award Voice DT (Dinar TN) ──
          // Users earn 1–2 DT every 2–3 minutes of voice activity.
          // Muted or deafened members earn at the same rate.
          const vmKey = `${guild.id}_${member.id}`;
          const vmData = this._voiceMinutes.get(vmKey) || { ticks: 0, threshold: 2 + Math.round(Math.random()) };
          vmData.ticks += 1;

          if (vmData.ticks >= vmData.threshold) {
            const dtGain = Math.floor(Math.random() * 2) + 1; // 1 or 2 DT
            const reason = 'Voice Earning';
            const result = economy.addBalance(guild.id, member.id, dtGain, reason);

            // If they crossed a new 100 DT milestone, tag them in the logs channel
            if (result && result.crossedMilestone) {
              fireMilestoneLog(client, guild, member.id, result.balance, result.crossedMilestone, reason).catch(() => null);
            }

            // Reset counter and pick a new random threshold (2 or 3 minutes)
            vmData.ticks = 0;
            vmData.threshold = 2 + Math.round(Math.random());
          }

          this._voiceMinutes.set(vmKey, vmData);
        }
      }
    }
  }

  /**
   * Directly awards XP for voice duration and triggers level-up message if necessary.
   */
  async awardVoiceXp(guild, member, xpGain) {
    if (!this.getLevelingEnabled(guild.id)) return;

    // Apply dynamic XP boost multiplier if active
    let multiplier = 1;
    try {
      const economy = require('./economyManager');
      multiplier = economy.getXpMultiplier(guild.id, member.id);
    } catch (e) {
      console.error('[LEVELING] Failed to resolve voice economy multiplier:', e);
    }
    const finalXpGain = Math.round(xpGain * multiplier);

    const userData = this._getUser(guild.id, member.id);
    const oldLevel = this.levelFromXp(userData.xp);

    userData.xp += finalXpGain;
    const newLevel = this.levelFromXp(userData.xp);
    
    userData.level = newLevel;

    this._saveAll();

    if (newLevel > oldLevel) {
      const milestone = this.getMilestoneForLevel(newLevel);
      const milestonesReached = this.getMilestonesBetween(oldLevel, newLevel);
      let assignedRole = null;

      if (milestone && milestonesReached.length > 0) {
        assignedRole = await this.updateMemberRole(member, milestone);
      }

      // Send announcement
      const levelChannelId = this.getLevelChannelId(guild.id);
      let targetChannel = null;

      if (levelChannelId) {
        const lvlChannel = await guild.channels.fetch(levelChannelId).catch(() => null);
        if (lvlChannel && lvlChannel.isTextBased()) {
          targetChannel = lvlChannel;
        }
      }

      if (!targetChannel) {
        // Fallback to system channel or first writeable text channel
        targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
      }

      if (targetChannel) {
        const progress = this.xpProgress(userData.xp);
        const filled = Math.round((progress.currentLevelXp / progress.nextLevelXp) * 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

        let alertContent = '';
        if (milestonesReached.length > 0 && milestone) {
          alertContent = `🎉 **Congratulations** ${member}! You have reached **Level ${newLevel}** via Voice Chat and unlocked the milestone role ${assignedRole ? `<@&${assignedRole.id}>` : `**${milestone.name}**`}!`;
        } else {
          alertContent = `⬆️ **Level Up!** ${member} is now **Level ${newLevel}** via Voice Chat!`;
        }

        const LEVEL_IMAGE_PATH = path.join(__dirname, '..', '..', 'level.png');
        const attachment = fs.existsSync(LEVEL_IMAGE_PATH)
          ? new AttachmentBuilder(LEVEL_IMAGE_PATH, { name: 'level.png' })
          : null;

        const embed = new EmbedBuilder()
          .setColor(milestonesReached.length > 0 ? 0xF59E0B : 0x6366F1)
          .setAuthor({
            name: `🔊 Voice Level Up! — ${member.user.username}`,
            iconURL: member.user.displayAvatarURL({ dynamic: true }),
          })
          .setDescription(
            milestonesReached.length > 0
              ? `${member} just leveled up to **Level ${newLevel}** by hanging out in voice channels and earned a new role!`
              : `${member} just leveled up to **Level ${newLevel}** by hanging out in voice channels!`
          )
          .addFields(
            {
              name: '📊 Progress',
              value: `\`[${bar}]\` ${progress.currentLevelXp.toLocaleString()} / ${progress.nextLevelXp.toLocaleString()} XP`,
              inline: false,
            },
            {
              name: '⭐ Total XP',
              value: `\`${userData.xp.toLocaleString()}\``,
              inline: true,
            },
            {
              name: '🎯 Current Level',
              value: `\`${newLevel}\``,
              inline: true,
            }
          )
          .setTimestamp()
          .setFooter({ text: 'Community Zone • Leveling System' });

        if (attachment) {
          embed.setImage('attachment://level.png');
        }

        if (milestonesReached.length > 0 && milestone) {
          embed.addFields({
            name: `${milestone.emoji} New Role Unlocked`,
            value: assignedRole
              ? `You've been awarded <@&${assignedRole.id}>!`
              : `**${milestone.name}** — Auto-created but could not be assigned yet. Please check permissions!`,
            inline: false,
          });
        }

        if (newLevel >= 250) {
          embed.setColor(0xFFD700);
          embed.addFields({
            name: '🌟 MAX LEVEL REACHED!',
            value: 'You have reached the pinnacle — **Level 250**! Legendary status achieved!',
            inline: false,
          });
        }

        const msgPayload = { 
          content: alertContent, 
          embeds: [embed],
          allowedMentions: {
            roles: [],
            users: [member.id]
          }
        };
        if (attachment) msgPayload.files = [attachment];

        await targetChannel.send(msgPayload).catch(() => null);
      }
    }
  }
}

module.exports = new LevelingManager();
module.exports.MILESTONE_ROLES = MILESTONE_ROLES;
module.exports.MAX_LEVEL = MAX_LEVEL;
