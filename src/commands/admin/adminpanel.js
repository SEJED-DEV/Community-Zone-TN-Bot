const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminpanel')
    .setDescription('Deploy the Professional Moderation Control Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to send the Moderation Panel to.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(client, interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const { getSafeEmoji } = require('../../utils/emojiHelper');

    const panelEmbed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle(`${getSafeEmoji('lock', client, false)} Moderation Command Center | مركز إدارة الرقابة`)
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
      new ButtonBuilder().setCustomId('admin_panel_ban').setLabel('Ban').setEmoji(getSafeEmoji('kick', client, true)).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin_panel_kick').setLabel('Kick').setEmoji(getSafeEmoji('kick', client, true)).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin_panel_timeout').setLabel('Timeout').setEmoji(getSafeEmoji('loading', client, true)).setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_panel_unban').setLabel('Unban').setEmoji(getSafeEmoji('unlock', client, true)).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('admin_panel_warn').setLabel('Warn').setEmoji(getSafeEmoji('error', client, true)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('admin_panel_info').setLabel('Info').setEmoji(getSafeEmoji('info', client, true)).setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [panelEmbed], components: [row1, row2] });

    if (channel.id !== interaction.channelId) {
      await interaction.reply({ content: `✅ Admin moderation panel successfully deployed in ${channel}.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `✅ Admin moderation panel successfully deployed.`, ephemeral: true });
    }
  },
};
