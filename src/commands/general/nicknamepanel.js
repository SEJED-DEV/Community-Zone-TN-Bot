const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const settingsManager = require('../../utils/settingsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nicknamepanel')
    .setDescription('Configure and deploy the Nickname Change panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Send the Nickname Change panel to a channel.')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('The channel to send the nickname panel to.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show where the nickname panel is currently configured.')
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ── /nicknamepanel setup ────────────────────────────────
    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');

      // Save panel channel to settings
      settingsManager.saveSettings({ nicknamePanelChannelId: channel.id });

      // Build the panel embed
      const panelEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🪪 𝐂𝐡𝐚𝐧𝐠𝐞 𝐍𝐢𝐜𝐤𝐧𝐚𝐦𝐞')
        .setDescription(
          '> Want to change how your name appears in the server?\n\n' +
          '**Click the button below** to set your custom nickname.\n\n' +
          '```\n• Your nickname must be 1 – 32 characters long.\n' +
          '• Nicknames must follow server rules.\n' +
          '• Admins can reset your nickname at any time.\n```'
        )
        .setFooter({ text: 'Community Zone • Nickname System' })
        .setTimestamp();

      // Build the button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('nickname_panel_btn')
          .setLabel('🪪 Change Nickname')
          .setStyle(ButtonStyle.Primary)
      );

      // Send to target channel
      await channel.send({ embeds: [panelEmbed], components: [row] });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Nickname Panel Deployed')
            .setDescription(`The Nickname Change panel has been sent to ${channel}.`)
            .setFooter({ text: 'Community Zone • Nickname System' })
            .setTimestamp(),
        ],
      });
    }

    // ── /nicknamepanel status ────────────────────────────────
    if (sub === 'status') {
      const settings = settingsManager.loadSettings();
      const channelId = settings.nicknamePanelChannelId;

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x6366F1)
            .setTitle('⚙️ Nickname Panel Configuration')
            .addFields({
              name: '📣 Panel Channel',
              value: channelId ? `<#${channelId}>` : '`Not set` — run `/nicknamepanel setup` first.',
              inline: false,
            })
            .setFooter({ text: 'Community Zone • Nickname System' })
            .setTimestamp(),
        ],
      });
    }
  },
};
