const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const levelingManager = require('../../managers/levelingManager');

/**
 * Event: messageCreate
 * Awards XP to users for every message sent (with a 15-second cooldown).
 * Handles level-up announcements and automatic milestone role upgrades.
 */
module.exports = {
  name: Events.MessageCreate,

  async execute(client, message) {
    // Ignore bots, webhooks, DMs, and system messages
    if (message.author.bot || message.webhookId || !message.guild || !message.member) return;

    const { guild, author, member } = message;

    // Award XP — returns level-up data or null if no level-up / on cooldown
    const levelUp = levelingManager.awardXp(guild.id, author.id);
    if (!levelUp) return;

    const { newLevel, milestonesReached } = levelUp;

    // ── Role Update ──────────────────────────────────────────
    // Find the highest milestone the user has now reached
    const currentMilestone = levelingManager.getMilestoneForLevel(newLevel);
    let assignedRole = null;

    if (currentMilestone && milestonesReached.length > 0) {
      // Only update roles when the user actually crossed a milestone threshold
      assignedRole = await levelingManager.updateMemberRole(member, currentMilestone);
    }

    // ── Level-Up Announcement ────────────────────────────────
    // Determine where to send the congrats message
    const levelChannelId = levelingManager.getLevelChannelId(guild.id);
    let targetChannel = message.channel; // Default: same channel as the message

    if (levelChannelId) {
      const lvlChannel = await guild.channels.fetch(levelChannelId).catch(() => null);
      if (lvlChannel && lvlChannel.isTextBased()) {
        targetChannel = lvlChannel;
      }
    }

    // Build the message ping text
    const isMilestone = milestonesReached.length > 0;
    const progress = levelingManager.xpProgress(levelUp.totalXp);
    
    let alertContent = '';
    if (isMilestone && currentMilestone) {
      alertContent = `🎉 **Congratulations** ${author}! You have reached **Level ${newLevel}** and unlocked the milestone role ${assignedRole ? `<@&${assignedRole.id}>` : `**${currentMilestone.name}**`}!`;
    } else {
      alertContent = `⬆️ **Level Up!** ${author} is now **Level ${newLevel}**!`;
    }

    const LEVEL_IMAGE_PATH = path.join(__dirname, '..', '..', '..', 'level.png');
    const attachment = fs.existsSync(LEVEL_IMAGE_PATH)
      ? new AttachmentBuilder(LEVEL_IMAGE_PATH, { name: 'level.png' })
      : null;

    // Progress bar visual
    const filled = Math.round((progress.currentLevelXp / progress.nextLevelXp) * 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

    const embed = new EmbedBuilder()
      .setColor(isMilestone ? 0xF59E0B : 0x6366F1) // Amber for milestone, Indigo for regular
      .setAuthor({
        name: `${isMilestone ? '🎊' : '⬆️'} Level Up! — ${author.username}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        isMilestone
          ? `${author} just leveled up to **Level ${newLevel}** and earned a new role!`
          : `${author} just leveled up to **Level ${newLevel}**!`
      )
      .addFields(
        {
          name: '📊 Progress',
          value: `\`[${bar}]\` ${progress.currentLevelXp.toLocaleString()} / ${progress.nextLevelXp.toLocaleString()} XP`,
          inline: false,
        },
        {
          name: '⭐ Total XP',
          value: `\`${levelUp.totalXp.toLocaleString()}\``,
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

    // Add milestone role field if applicable
    if (isMilestone && currentMilestone) {
      embed.addFields({
        name: `${currentMilestone.emoji} New Role Unlocked`,
        value: assignedRole
          ? `You've been awarded <@&${assignedRole.id}>!`
          : `**${currentMilestone.name}** — Auto-created but could not be assigned yet. Please check permissions!`,
        inline: false,
      });
    }

    // Add special message for Level 250 (max level)
    if (newLevel >= 250) {
      embed.setColor(0xFFD700); // Gold
      embed.addFields({
        name: '🌟 MAX LEVEL REACHED!',
        value: 'You have reached the pinnacle — **Level 250**! Legendary status achieved!',
        inline: false,
      });
    }

    try {
      const msgPayload = { 
        content: alertContent, 
        embeds: [embed],
        allowedMentions: {
          roles: [],
          users: [author.id]
        }
      };
      if (attachment) msgPayload.files = [attachment];

      await targetChannel.send(msgPayload);
    } catch (err) {
      console.error('[LEVELING] Failed to send level-up message:', err);
    }
  },
};
