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
  async log(client, title, fields = [], color = config.colors.accent, thumbnailUrl = null) {
    // Console output for terminal diagnostics
    console.log(`[LOG] ${title}: ${fields.map(f => `${f.name}=${f.value.substring(0, 100)}`).join(', ')}`);

    const logChannelId = config.logChannelId;
    if (!logChannelId || logChannelId === 'YOUR_LOG_CHANNEL_ID_HERE') {
      return; // Logging channel not configured yet
    }

    try {
      const channel = await client.channels.fetch(logChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[LOGGER WARNING] Log channel (${logChannelId}) not found or is not a text channel.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: 'Community Zone • Dev by sejed.dev & akaza_senior' });

      if (thumbnailUrl) {
        embed.setThumbnail(thumbnailUrl);
      }

      await channel.send({ embeds: [embed] }).catch(err => {
        console.error(`[LOGGER ERROR] Failed to send embed to log channel:`, err);
      });
    } catch (error) {
      console.error('[LOGGER ERROR] Unexpected error while sending audit logs:', error);
    }
  }

  /**
   * Quick wrappers for specific logging events
   */
  async info(client, title, fields) {
    return this.log(client, title, fields, config.colors.info);
  }

  async success(client, title, fields) {
    return this.log(client, title, fields, config.colors.success);
  }

  async warning(client, title, fields) {
    return this.log(client, title, fields, config.colors.warning);
  }

  async error(client, title, fields) {
    return this.log(client, title, fields, config.colors.danger);
  }

  async moderation(client, title, fields) {
    return this.log(client, title, fields, config.colors.logging.moderation);
  }
}

module.exports = new Logger();
