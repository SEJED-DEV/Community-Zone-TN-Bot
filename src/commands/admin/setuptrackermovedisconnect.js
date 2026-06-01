const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const settingsManager = require('../../utils/settingsManager');
const embedGenerator = require('../../utils/embedGenerator');
const logger = require('../../utils/logger');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuptrackermovedisconnect')
    .setDescription('Configure the text channel for logging staff voice moves and disconnects.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt.setName('channel')
         .setDescription('The text channel where tracker logs will be sent.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    ),

  async execute(client, interaction) {
    const channel = interaction.options.getChannel('channel');

    // Case 1: Diagnostic/View configuration
    if (!channel) {
      await interaction.deferReply({ ephemeral: true });
      const currentChannelId = config.trackerLogChannelId;
      const channelCheck = currentChannelId
        ? `<#${currentChannelId}> (\`${currentChannelId}\`)`
        : '❌ Not Configured';

      const embed = embedGenerator.info(
        `**🛠️ Staff Move & Disconnect Tracker Settings:**\n\n` +
        `• **Tracker Logs Channel**: ${channelCheck}\n\n` +
        `**💡 How to reconfigure:**\n` +
        `Type \`/setuptrackermovedisconnect\` and select a text channel to update this setting.`,
        '🛠️ Staff Tracker Diagnostic'
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // Case 2: Update configuration
    await interaction.deferReply({ ephemeral: true });

    const newSettings = {
      trackerLogChannelId: channel.id
    };

    const success = settingsManager.saveSettings(newSettings);

    if (success) {
      const summaryEmbed = embedGenerator.success(
        `**Successfully updated staff tracker settings in persistent storage and memory!**\n\n` +
        `• **Tracker Channel**: Set to <#${channel.id}> (\`${channel.id}\`)\n\n` +
        `**💡 System Sync Info:**\n` +
        `• Any manual voice moves or disconnects executed by staff members will now be logged here.`,
        '✅ Staff Tracker Applied'
      );

      await interaction.editReply({ embeds: [summaryEmbed] });

      // Audit Log the setup change
      await logger.success(client, '⚙️ Staff Tracker Reconfigured', [
        { name: 'Administrator', value: `<@${interaction.user.id}>` },
        { name: 'Tracker Logs Channel', value: `<#${channel.id}>` }
      ]);
    } else {
      const errEmbed = embedGenerator.error('Failed to commit tracker configurations to local JSON storage.');
      await interaction.editReply({ embeds: [errEmbed] });
    }
  }
};
