const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
const config = require('../config');

// Resolve the local banner image once at load time
const BANNER_PATH = path.join(__dirname, '..', '..', 'dashboard.png');
const BANNER_ATTACHMENT_NAME = 'dashboard.png';

const FALLBACK_EMOJIS = {
  rename: '📝',
  limit: '👥',
  lock: '🔒',
  unlock: '🔓',
  hide: '🙈',
  show: '👀',
  owner: '👑',
  kick: '🦶',
  allow: '✅',
  deny: '❌',
  mute: '🔇',
  deafen: '🔕',
  access: '🚪',
  info: 'ℹ',
  loading: '⏳',
  success: '🎉',
  error: '⚠'
};

function getSafeEmoji(key, client, forButton = true) {
  const emojiStr = config.emojis[key];
  if (!emojiStr) return FALLBACK_EMOJIS[key] || null;
  const match = emojiStr.match(/<a?:([a-zA-Z0-9_]+):([0-9]+)>/);
  if (match) {
    const id = match[2];
    if (client && client.emojis && client.emojis.cache.has(id)) {
      return forButton ? id : emojiStr;
    }
    return FALLBACK_EMOJIS[key] || null;
  }
  return emojiStr;
}

/**
 * Utility to generate the dashboard panel for temporary text channels.
 */
class DashboardGenerator {
  /**
   * Generates the beautiful, premium Embed indicating the current room status.
   * @param {GuildMember} owner - The current room owner GuildMember
   * @param {VoiceChannel} voiceChannel - The temporary voice channel object
   * @param {Object} roomDetails - Metadata from memory cache
   */
  generateEmbed(owner, voiceChannel, roomDetails) {
    this.client = voiceChannel?.client;
    const limit = voiceChannel.userLimit === 0 ? 'Unlimited' : `${voiceChannel.userLimit} Users`;
    const memberCount = voiceChannel.members.size;
    
    const lockEmoji = getSafeEmoji('lock', voiceChannel?.client, false);
    const unlockEmoji = getSafeEmoji('unlock', voiceChannel?.client, false);
    const hideEmoji = getSafeEmoji('hide', voiceChannel?.client, false);
    const showEmoji = getSafeEmoji('show', voiceChannel?.client, false);

    const accessType = roomDetails.locked ? `${lockEmoji} Private (Locked)` : `${unlockEmoji} Public`;
    const visibility = roomDetails.hidden ? `${hideEmoji} Hidden` : `${showEmoji} Visible`;

    const whitelistedUsersStr = roomDetails.whitelistedUsers.size > 0 
      ? Array.from(roomDetails.whitelistedUsers).map(id => `<@${id}>`).join(', ') 
      : 'None';

    const whitelistedRolesStr = roomDetails.whitelistedRoles.size > 0
      ? Array.from(roomDetails.whitelistedRoles).map(id => `<@&${id}>`).join(', ')
      : 'None';

    return new EmbedBuilder()
      .setTitle('👑 Temporary Voice Room Dashboard')
      .setDescription(
        `Welcome to your personal room control panel! As the room owner, you can manage permissions, limits, and visibility directly using the premium buttons below.\n\n` +
        `**⚠️ Global Block Override Active:** Globally blocked users are completely restricted from joining or viewing this room, overriding whitelists.`
      )
      .setColor(config.colors.accent)
      .addFields([
        { name: '👤 Room Owner', value: `<@${owner.id}> (${owner.user.tag})`, inline: true },
        { name: '🔊 Voice Channel', value: `<#${voiceChannel.id}>`, inline: true },
        { name: '👥 Room Limit', value: `\`${limit}\` (Active: \`${memberCount}\`)`, inline: true },
        { name: '🚪 Access Status', value: `\`${accessType}\``, inline: true },
        { name: '👁️ Visibility', value: `\`${visibility}\``, inline: true },
        { name: '📅 Created At', value: `<t:${Math.floor(roomDetails.createdAt.getTime() / 1000)}:R>`, inline: true },
        { name: '✅ Whitelisted Users', value: whitelistedUsersStr, inline: false },
        { name: '🛡️ Whitelisted Roles', value: whitelistedRolesStr, inline: false },
      ])
      .setThumbnail(owner.user.displayAvatarURL({ dynamic: true }))
      .setImage(`attachment://${BANNER_ATTACHMENT_NAME}`)
      .setTimestamp()
      .setFooter({
        text: 'Owner Control Panel • Clicking buttons is restricted to Room Owner',
        iconURL: 'https://cdn.discordapp.com/emojis/1150495818987413554.webp?size=128&quality=lossless'
      });
  }

  /**
   * Generates the multi-row button controls for the dashboard panel.
   */
  generateButtons(client) {
    const activeClient = client || this.client;
    // Row 1: Actions related to basic status & settings
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn-rename')
        .setLabel('Rename')
        .setEmoji(getSafeEmoji('rename', activeClient, true))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn-limit')
        .setLabel('Limit')
        .setEmoji(getSafeEmoji('limit', activeClient, true))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn-mute')
        .setLabel('Mute/Unmute')
        .setEmoji(getSafeEmoji('mute', activeClient, true))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn-kick')
        .setLabel('Kick')
        .setEmoji(getSafeEmoji('kick', activeClient, true))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('btn-info')
        .setLabel('Room Info')
        .setEmoji(getSafeEmoji('info', activeClient, true))
        .setStyle(ButtonStyle.Secondary)
    );

    // Row 2: Actions related to visibility & general locks
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn-lock')
        .setLabel('Lock')
        .setEmoji(getSafeEmoji('lock', activeClient, true))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('btn-unlock')
        .setLabel('Unlock')
        .setEmoji(getSafeEmoji('unlock', activeClient, true))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn-hide')
        .setLabel('Hide')
        .setEmoji(getSafeEmoji('hide', activeClient, true))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('btn-show')
        .setLabel('Show')
        .setEmoji(getSafeEmoji('show', activeClient, true))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn-access')
        .setLabel('Toggle Public')
        .setEmoji(getSafeEmoji('access', activeClient, true))
        .setStyle(ButtonStyle.Secondary)
    );

    // Row 3: Whitelisting, Handovers and Deafen
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn-allow')
        .setLabel('Whitelist User/Role')
        .setEmoji(getSafeEmoji('allow', activeClient, true))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn-deny')
        .setLabel('Revoke Access')
        .setEmoji(getSafeEmoji('deny', activeClient, true))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('btn-transfer')
        .setLabel('Transfer Ownership')
        .setEmoji(getSafeEmoji('owner', activeClient, true))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn-deafen')
        .setLabel('Deafen/Undeafen')
        .setEmoji(getSafeEmoji('deafen', activeClient, true))
        .setStyle(ButtonStyle.Primary)
    );

    return [row1, row2, row3];
  }

  /**
   * Generates a minimal button row displayed during an ownership election,
   * allowing any room member to open the voting dropdown.
   */
  generateElectionButton(voiceId) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`temp_voice_vote_open_${voiceId}`)
        .setLabel('🗳️ Cast Your Vote | صوّت الآن')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`temp_voice_vote_skip_${voiceId}`)
        .setLabel('⏭️ Skip (No Vote) | تخطي')
        .setStyle(ButtonStyle.Secondary)
    );
    return [row];
  }
  /**
   * Returns an AttachmentBuilder for the banner image to send alongside the embed.
   */
  getBannerAttachment() {
    return new AttachmentBuilder(BANNER_PATH, { name: BANNER_ATTACHMENT_NAME });
  }
}

module.exports = new DashboardGenerator();
