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
    .setName('setuptag')
    .setDescription('Configure and deploy the Server Tag Management Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    const { emojis } = require('../../config');
    const getEmoji = (key) => emojis[key] || '';

    const panelEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle('🏷️ Server Tag Management | إدارة تاق السيرفر')
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
      new ButtonBuilder().setCustomId('tag_panel_set').setLabel('Change Server Tag').setEmoji(getEmoji('rename')).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tag_panel_reset').setLabel('Reset to Default').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tag_panel_disable').setLabel('Disable Tag').setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tag_panel_apply_all').setLabel('Apply to All Members').setEmoji(getEmoji('success')).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('tag_panel_remove_all').setLabel('Remove from All Members').setEmoji(getEmoji('deny')).setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [panelEmbed], components: [row1, row2] });
  },
};
