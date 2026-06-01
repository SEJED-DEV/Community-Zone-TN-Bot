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
    .setName('setuptag')
    .setDescription('Configure and deploy the Server Tag Management Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to send the Tag Management Panel to.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(client, interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const { getSafeEmoji } = require('../../utils/emojiHelper');

    const panelEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle(`${getSafeEmoji('rename', client, false)} Server Tag Management | إدارة تاق السيرفر`)
      .setDescription(
        'Use the buttons below to manage the automatic server tag for all members.\n' +
        'استخدم الأزرار أدناه لإدارة تاق السيرفر التلقائي لجميع الأعضاء.\n\n' +
        '**⚙️ Configuration:**\n' +
        '• `🏷️ Change Tag` — Set a new prefix for all nicknames.\n' +
        '• `🔄 Reset` — Revert to the default server tag.\n' +
        '• `🚫 Disable` — Stop applying tags to new members.\n\n' +
        '**🚀 Bulk Actions:**\n' +
        '• `✅ Apply to All` — Force-apply the current tag to every member.\n' +
        '• `🗑️ Remove from All` — Strip the tag from all current nicknames.'
      )
      .setFooter({ text: 'Community Zone • Tag System' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tag_panel_set').setLabel('Change').setEmoji(getSafeEmoji('rename', client, true)).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tag_panel_reset').setLabel('Reset').setEmoji(getSafeEmoji('lock', client, true)).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tag_panel_disable').setLabel('Disable').setEmoji(getSafeEmoji('deny', client, true)).setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tag_panel_apply_all').setLabel('Apply All').setEmoji(getSafeEmoji('success', client, true)).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('tag_panel_remove_all').setLabel('Remove All').setEmoji(getSafeEmoji('deny', client, true)).setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [panelEmbed], components: [row1, row2] });

    if (channel.id !== interaction.channelId) {
      await interaction.reply({ content: `✅ Tag management panel successfully deployed in ${channel}.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `✅ Tag management panel successfully deployed.`, ephemeral: true });
    }
  },
};
