const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getSafeEmoji } = require('./emojiHelper');

/**
 * Shared aesthetic utility for generating standardized premium-quality embeds.
 */
class EmbedGenerator {
  /**
   * Create a standard styled Embed.
   */
  createBase(title, description, color = config.colors.info) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp()
      .setFooter({
        text: 'Community Zone • Dev by sejed.dev & akaza_senior',
        iconURL: 'https://cdn.discordapp.com/emojis/1150495818987413554.webp?size=128&quality=lossless'
      });
  }

  /**
   * Generate a success Embed.
   */
  success(description, title) {
    const finalTitle = title || `${getSafeEmoji('success', null, false)} Success`;
    return this.createBase(finalTitle, description, config.colors.success);
  }

  /**
   * Generate an error/warning Embed.
   */
  error(description, title) {
    const finalTitle = title || `${getSafeEmoji('error', null, false)} Error`;
    return this.createBase(finalTitle, description, config.colors.danger);
  }

  /**
   * Generate a warning Embed.
   */
  warning(description, title) {
    const finalTitle = title || `${getSafeEmoji('warning', null, false)} Warning`;
    return this.createBase(finalTitle, description, config.colors.warning);
  }

  /**
   * Generate an info Embed.
   */
  info(description, title) {
    const finalTitle = title || `${getSafeEmoji('info', null, false)} System Information`;
    return this.createBase(finalTitle, description, config.colors.info);
  }

  /**
   * Generate a custom logging Embed.
   */
  log(title, fields = [], color = config.colors.info, thumbnail = null) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: 'Audit Logging System' });

    if (fields.length > 0) {
      embed.addFields(fields);
    }
    
    if (thumbnail) {
      embed.setThumbnail(thumbnail);
    }

    return embed;
  }
}

module.exports = new EmbedGenerator();
