const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminpanel')
    .setDescription('Deploy the Professional Moderation Control Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    const { emojis } = require('../../config');
    const getEmoji = (key) => emojis[key] || '';

    const panelEmbed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('🛡️ Moderation Command Center | مركز إدارة الرقابة')
      .setDescription(
        'Quick access to server moderation tools. Actions taken here are logged automatically.\n' +
        'وصول سريع لأدوات الرقابة. جميع الإجراءات المتخذة هنا يتم تسجيلها تلقائياً.\n\n' +
        '**🔨 Punishments:**\n' +
        '• `Ban` / `Unban` — Manage server access.\n' +
        '• `Kick` — Remove a member immediately.\n' +
        '• `Timeout` — Mute a member for a duration.\n\n' +
        '**📋 Information:**\n' +
        '• `Warn` — Issue a formal warning.\n' +
        '• `User Info` — View detailed account history.'
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Community Zone • Admin Moderation Panel' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_panel_ban').setLabel('Ban Member').setEmoji(getEmoji('kick')).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin_panel_kick').setLabel('Kick Member').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin_panel_timeout').setLabel('Timeout (Mute)').setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_panel_unban').setLabel('Unban User').setEmoji(getEmoji('unlock')).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('admin_panel_warn').setLabel('Warn Member').setEmoji(getEmoji('error')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('admin_panel_info').setLabel('User Info').setEmoji(getEmoji('info')).setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [panelEmbed], components: [row1, row2] });
  },
};
