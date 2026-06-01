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
    .setName('voicepanel')
    .setDescription('Configure and deploy the Temporary Voice Room Control Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Send the Voice Control Panel to a channel.')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('The channel to send the Voice Control Panel to.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show where the voice panel is currently deployed.'),
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    // ── /voicepanel setup ──────────────────────────────────
    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');

      // Save panel channel to settings
      settingsManager.saveSettings({ voicePanelChannelId: channel.id });

      const { getSafeEmoji } = require('../../utils/emojiHelper');

      const panelEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle(`${getSafeEmoji('owner', client, false)} Temporary Voice Room Panel | لوحة التحكم بالروم المؤقت`)
        .setDescription(
          '> Click the buttons below to manage your temporary voice channel.\n' +
          '> اضغط على الأزرار أدناه للتحكم في قناتك الصوتية المؤقتة.\n\n' +
          '**🔐 Room Access | صلاحيات الروم:**\n' +
          '• `🔒 Lock` / `🔓 Unlock` — Restrict or allow anyone to join.\n' +
          '• `👁️ Hide` / `👀 Show` — Make the channel invisible or visible.\n\n' +
          '**⚙️ Customization | التعديل والتخصيص:**\n' +
          '• `📝 Rename` — Change your voice room name.\n' +
          '• `👥 Limit` — Set a member capacity limit (0 for unlimited).\n\n' +
          '**👥 Member Moderation | إدارة الأعضاء:**\n' +
          '• `🎙️ Mute` — Server-mute or unmute a member.\n' +
          '• `🔕 Deafen` — Server-deafen or undeafen a member.\n' +
          '• `🚷 Kick` — Kick a user out of your room.'
        )
        .addFields([
          {
            name: '💡 Usage Note | ملاحظة للاستخدام',
            value: 'You must **own an active temporary voice room** to use these buttons.\nيجب أن **تكون مالكاً لروم مؤقت نشط** لتتمكن من استخدام هذه الأزرار.',
            inline: false,
          },
        ])
        .setFooter({ text: 'Community Zone • Voice Control Panel' })
        .setTimestamp();

      // Row 1: Rename, Limit, Mute, Kick, Info
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn-rename').setLabel('Rename').setEmoji(getSafeEmoji('rename', client, true)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn-limit').setLabel('Limit').setEmoji(getSafeEmoji('limit', client, true)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn-mute').setLabel('Mute/Unmute').setEmoji(getSafeEmoji('mute', client, true)).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn-kick').setLabel('Kick').setEmoji(getSafeEmoji('kick', client, true)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn-info').setLabel('Room Info').setEmoji(getSafeEmoji('info', client, true)).setStyle(ButtonStyle.Secondary)
      );

      // Row 2: Lock, Unlock, Hide, Show, Access
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn-lock').setLabel('Lock').setEmoji(getSafeEmoji('lock', client, true)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn-unlock').setLabel('Unlock').setEmoji(getSafeEmoji('unlock', client, true)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn-hide').setLabel('Hide').setEmoji(getSafeEmoji('hide', client, true)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn-show').setLabel('Show').setEmoji(getSafeEmoji('show', client, true)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn-access').setLabel('Toggle Public').setEmoji(getSafeEmoji('access', client, true)).setStyle(ButtonStyle.Secondary)
      );

      // Row 3: Allow, Deny, Transfer, Deafen
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn-allow').setLabel('Whitelist').setEmoji(getSafeEmoji('allow', client, true)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn-deny').setLabel('Revoke').setEmoji(getSafeEmoji('deny', client, true)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn-transfer').setLabel('Transfer').setEmoji(getSafeEmoji('owner', client, true)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn-deafen').setLabel('Deafen').setEmoji(getSafeEmoji('deafen', client, true)).setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [panelEmbed], components: [row1, row2, row3] });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Voice Panel Deployed')
            .setDescription(`The Temporary Voice Room Control Panel has been sent to ${channel}.\nتم إرسال لوحة التحكم بالروم المؤقت إلى ${channel}.`)
            .setFooter({ text: 'Community Zone • Voice System' })
            .setTimestamp(),
        ],
      });
    }

    // ── /voicepanel status ─────────────────────────────────
    if (sub === 'status') {
      const settings = settingsManager.loadSettings();
      const channelId = settings.voicePanelChannelId;

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x6366F1)
            .setTitle('⚙️ Voice Panel Configuration')
            .addFields({
              name: '📣 Panel Channel',
              value: channelId ? `<#${channelId}>` : '`Not set` — run `/voicepanel setup` first.',
              inline: false,
            })
            .setFooter({ text: 'Community Zone • Voice System' })
            .setTimestamp(),
        ],
      });
    }
  },
};
