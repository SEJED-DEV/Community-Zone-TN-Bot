const { EmbedBuilder } = require('discord.js');
const config = require('../config');

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
  success(description, title = `${config.emojis.success} Success`) {
    return this.createBase(title, description, config.colors.success);
  }

  /**
   * Generate an error/warning Embed.
   */
  error(description, title = `${config.emojis.error} Error`) {
    return this.createBase(title, description, config.colors.danger);
  }

  /**
   * Generate a warning Embed.
   */
  warning(description, title = `${config.emojis.error} Warning`) {
    return this.createBase(title, description, config.colors.warning);
  }

  /**
   * Generate an info Embed.
   */
  info(description, title = `${config.emojis.info} System Information`) {
    return this.createBase(title, description, config.colors.info);
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
