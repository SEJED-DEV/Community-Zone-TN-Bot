const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const embedGenerator = require('../../utils/embedGenerator');
const config = require('../../config');
const logger = require('../../utils/logger');
const { getSafeEmoji } = require('../../utils/emojiHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('🧹 Bulk delete messages from the current channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt =>
      opt.setName('amount')
         .setDescription('Number of messages to delete (1-100).')
         .setRequired(true)
         .setMinValue(1)
         .setMaxValue(100)
    ),

  async execute(client, interaction) {
    const amount = interaction.options.getInteger('amount');

    // Purge log channel ID: 1509337059008053248
    const PURGE_LOG_CHANNEL_ID = '1509337059008053248';

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);

      const successEmbed = embedGenerator.success(`Successfully purged **${deleted.size}** messages.`);
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      // Log to designated channel
      const logChannel = await interaction.guild.channels.fetch(PURGE_LOG_CHANNEL_ID).catch(() => null);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle(`${getSafeEmoji('purge', client, false)} Message Purge Log`)
          .setColor(config.colors.warning)
          .addFields(
            { name: `${getSafeEmoji('member', client, false)} Moderator`, value: `<@${interaction.user.id}>`, inline: true },
            { name: '📁 Channel', value: `<#${interaction.channelId}>`, inline: true },
            { name: '🔢 Amount', value: `\`${deleted.size}\` messages`, inline: true }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }

      await logger.warning(client, `${getSafeEmoji('purge', client, false)} Messages Purged`, [
        { name: 'Moderator', value: interaction.user.tag },
        { name: 'Channel', value: interaction.channel.name },
        { name: 'Count', value: `${deleted.size}` }
      ]);

    } catch (err) {
      console.error('[PURGE ERROR]', err);
      return interaction.reply({
        embeds: [embedGenerator.error(`Failed to purge messages: ${err.message}`)],
        ephemeral: true
      });
    }
  },
};
