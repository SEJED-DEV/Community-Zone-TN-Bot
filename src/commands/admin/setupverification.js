const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const settingsManager = require('../../utils/settingsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupverification')
    .setDescription('Configure the user verification system.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt =>
      opt.setName('staff_role')
         .setDescription('Role authorized to claim verification requests.')
         .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('male_role')
         .setDescription('Role to give when Male is clicked.')
         .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('female_role')
         .setDescription('Role to give when Female is clicked.')
         .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('log_channel')
         .setDescription('Channel where verification messages are sent.')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('trigger_channels')
         .setDescription('Comma-separated IDs of voice channels that trigger verification.')
         .setRequired(true)
    ),

  async execute(client, interaction) {
    const staffRole = interaction.options.getRole('staff_role');
    const maleRole = interaction.options.getRole('male_role');
    const femaleRole = interaction.options.getRole('female_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const triggersStr = interaction.options.getString('trigger_channels');

    const triggerChannels = triggersStr.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s));

    if (triggerChannels.length === 0) {
      return interaction.reply({ content: '❌ Invalid trigger channel IDs provided.', ephemeral: true });
    }

    const settings = settingsManager.loadSettings();
    settings.verifyStaffRole = staffRole.id;
    settings.verifyMaleRole = maleRole.id;
    settings.verifyFemaleRole = femaleRole.id;
    settings.verifyLogChannel = logChannel.id;
    settings.verifyTriggerChannels = triggerChannels;

    settingsManager.saveSettings(settings);

    // Update live config
    const config = require('../../config');
    config.verification.staffRole = staffRole.id;
    config.verification.maleRole = maleRole.id;
    config.verification.femaleRole = femaleRole.id;
    config.verification.logChannel = logChannel.id;
    config.verification.triggerChannels = triggerChannels;

    const embed = new EmbedBuilder()
      .setTitle('✅ Verification System Configured')
      .setColor(0x10B981)
      .addFields(
        { name: 'Staff Role', value: staffRole.toString(), inline: true },
        { name: 'Male Role', value: maleRole.toString(), inline: true },
        { name: 'Female Role', value: femaleRole.toString(), inline: true },
        { name: 'Log Channel', value: logChannel.toString(), inline: true },
        { name: 'Trigger Channels', value: triggerChannels.map(id => `<#${id}>`).join(', '), inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
