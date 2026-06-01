const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { getPrefix, setPrefix, applyPrefix } = require('../../utils/prefixManager');
const settingsManager = require('../../utils/settingsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuptag')
    .setDescription('Open the server tag/prefix management panel. (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    const currentTag = getPrefix();

    const embed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle('🏷️ Server Tag Management Panel')
      .setDescription(
        `Configure the **server tag/prefix** that is automatically applied to every member's nickname.\n\n` +
        `When a member joins or changes their nickname, the tag is **automatically re-applied**.\n\n` +
        `**Current Tag:**\n` +
        `\`\`\`${currentTag}\`\`\`\n` +
        `**Preview:**\n` +
        `\`${currentTag}username\``
      )
      .addFields(
        {
          name: '⚙️ How it works',
          value:
            '• Tag is applied to **new members** on join\n' +
            '• Tag is **re-enforced** if someone removes it\n' +
            '• Use `/applyprefixall` to apply to **all existing members**\n' +
            '• The tag is saved permanently in bot settings',
          inline: false,
        }
      )
      .setFooter({ text: 'Community Zone • Tag Management' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tag_panel_set')
        .setLabel('✏️ Change Tag')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('tag_panel_reset')
        .setLabel('🔄 Reset to Default')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('tag_panel_apply_all')
        .setLabel('👥 Apply to All')
        .setStyle(ButtonStyle.Success),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tag_panel_remove_all')
        .setLabel('🗑️ Remove Tag from All')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('tag_panel_disable')
        .setLabel('🚫 Disable Tag')
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2],
    });
  },
};
