const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Handles professional logging inside the Discord server and console.
 */
class Logger {
  /**
   * Log an event inside the server log channel.
   * @param {Client} client - Discord Bot Client
   * @param {string} title - Title of the log embed
   * @param {Array} fields - Array of { name, value, inline } objects
   * @param {number} color - Color code for the embed
   * @param {string} [thumbnailUrl] - Optional thumbnail URL
   */
  /**
   * Log an event inside a specific log channel from config.logChannels or fallback.
   * @param {Client} client - Discord Bot Client
   * @param {string} title - Title of the log embed
   * @param {Array} fields - Array of { name, value, inline } objects
   * @param {number} color - Color code for the embed
   * @param {string|null} [thumbnailUrl] - Optional thumbnail URL
   * @param {string|null} [channelId] - Explicit channel ID to override default
   */
  async log(client, title, fields = [], color = config.colors.accent, thumbnailUrl = null, channelId = null) {
    // Console output for terminal diagnostics
    console.log(`[LOG] ${title}: ${fields.map(f => `${f.name}=${f.value.toString().substring(0, 100)}`).join(', ')}`);

    const targetChannelId = channelId || config.logChannelId;
    if (!targetChannelId || targetChannelId === 'YOUR_LOG_CHANNEL_ID_HERE') {
      return; // Logging channel not configured yet
    }

    try {
      const channel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[LOGGER WARNING] Log channel (${targetChannelId}) not found or is not a text channel.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: 'Community Zone • Advanced Logging System' });

      if (thumbnailUrl) {
        embed.setThumbnail(thumbnailUrl);
      }

      await channel.send({ embeds: [embed] }).catch(err => {
        console.error(`[LOGGER ERROR] Failed to send embed to log channel ${targetChannelId}:`, err);
      });
    } catch (error) {
      console.error('[LOGGER ERROR] Unexpected error while sending audit logs:', error);
    }
  }

  /**
   * Quick wrappers for specific logging events
   */
  async info(client, title, fields, channelId = null) {
    return this.log(client, title, fields, config.colors.info, null, channelId);
  }

  async success(client, title, fields, channelId = null) {
    return this.log(client, title, fields, config.colors.success, null, channelId);
  }

  async warning(client, title, fields, channelId = null) {
    return this.log(client, title, fields, config.colors.warning, null, channelId);
  }

  async error(client, title, fields, channelId = null) {
    return this.log(client, title, fields, config.colors.danger, null, channelId);
  }

  async moderation(client, title, fields, channelId = null) {
    return this.log(client, title, fields, config.colors.logging.moderation, null, channelId);
  }
}

module.exports = new Logger();
