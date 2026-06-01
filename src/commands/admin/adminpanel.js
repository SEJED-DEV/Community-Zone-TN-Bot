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
    .setName('adminpanel')
    .setDescription('Deploy or configure the Admin Moderation Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Send the Admin Moderation Panel to a channel.')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('The channel to send the Admin Panel to.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Show Admin Panel and moderation channel configuration.')
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    // ── /adminpanel status ────────────────────────────────
    if (sub === 'status') {
      const settings = settingsManager.loadSettings();
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x6366F1)
            .setTitle('⚙️ Admin Panel Configuration | إعدادات لوحة الإدارة')
            .addFields(
              { name: '📣 Ban Channel | قناة الحظر',          value: settings.banAnnouncementChannelId ? `<#${settings.banAnnouncementChannelId}>` : '`Not set` — /setup ban_channel', inline: false },
              { name: '📤 Leave/Kick Channel | قناة المغادرة', value: settings.leaveChannelId ? `<#${settings.leaveChannelId}>` : '`Not set` — /setup leave_channel', inline: false },
              { name: '🛡️ Admin Panel Channel | قناة اللوحة',  value: settings.adminPanelChannelId ? `<#${settings.adminPanelChannelId}>` : '`Not deployed yet`', inline: false },
            )
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
            .setTimestamp(),
        ],
      });
    }

    // ── /adminpanel setup ─────────────────────────────────
    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      settingsManager.saveSettings({ adminPanelChannelId: channel.id });

      const panelEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('🛡️ Administration & Moderation Panel | لوحة الإدارة والتحكم')
        .setDescription(
          '> Use the buttons below to perform moderation actions.\n' +
          '> استخدم الأزرار أدناه لتنفيذ إجراءات الإشراف.\n\n' +
          '```\n' +
          '🔨  Ban      | حظر دائم    — Permanently ban a member\n' +
          '👢  Kick     | طرد         — Remove a member temporarily\n' +
          '⏰  Timeout  | كتم مؤقت   — Mute a member for X minutes\n' +
          '🔓  Unban    | رفع الحظر  — Remove a ban\n' +
          '⚠️  Warn     | تحذير       — Send a formal DM warning\n' +
          '📋  Info     | معلومات    — View detailed member info\n' +
          '```'
        )
        .addFields([
          {
            name: '⚠️ Access Restricted | صلاحية محدودة',
            value: 'Only **Administrators** can execute these actions.\nفقط **المسؤولون** يمكنهم تنفيذ هذه الإجراءات.',
            inline: false,
          },
        ])
        .setTimestamp()
        .setFooter({ text: 'Community Zone • Dev by Akaza_senior' });

      // Row 1: Ban, Kick, Timeout
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_panel_ban').setLabel('🔨 Ban | حظر').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('admin_panel_kick').setLabel('👢 Kick | طرد').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_panel_timeout').setLabel('⏰ Timeout | كتم').setStyle(ButtonStyle.Secondary),
      );

      // Row 2: Unban, Warn, Info
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_panel_unban').setLabel('🔓 Unban | رفع الحظر').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('admin_panel_warn').setLabel('⚠️ Warn | تحذير').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('admin_panel_info').setLabel('📋 Info | معلومات').setStyle(ButtonStyle.Primary),
      );

      await channel.send({ embeds: [panelEmbed], components: [row1, row2] });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Admin Panel Deployed | تم نشر لوحة الإدارة')
            .setDescription(`The Admin Moderation Panel has been sent to ${channel}.\nتم إرسال لوحة الإدارة إلى ${channel}.`)
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
            .setTimestamp(),
        ],
      });
    }
  },
};
