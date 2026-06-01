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
    .setName('setupeconomy')
    .setDescription('Configure and deploy the Economy & Shop Control Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to send the Economy Panels to.')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.options.getChannel('channel');
    const { getSafeEmoji } = require('../../utils/emojiHelper');

    // ─── PANEL 1: SHOP ──────────────────────────────────────────
    const shopEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle(`${getSafeEmoji('shop', client, false)} Dinar TN Central Shop | متجر دينار تونسي`)
      .setDescription('Purchase crates and exclusive roles below!')
      .setFooter({ text: 'Community Zone • Economy System' });

    const rowCrates = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_buy_crate_common').setLabel('Common Crate').setEmoji('📦').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop_buy_crate_rare').setLabel('Rare Crate').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop_buy_crate_epic').setLabel('Epic Crate').setEmoji('💎').setStyle(ButtonStyle.Secondary)
    );

    const rowRoles = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_buy_role_diamond').setLabel('Diamond Role').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('shop_buy_role_vip').setLabel('VIP Role').setStyle(ButtonStyle.Primary)
    );

    const rowOther = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_buy_boost').setLabel('XP Boost ×2').setEmoji(getSafeEmoji('xp', client, true)).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_buy_custom_name').setLabel('Custom Role Name').setEmoji(getSafeEmoji('owner', client, true)).setStyle(ButtonStyle.Secondary)
    );

    // ─── PANEL 2: CASINO ────────────────────────────────────────
    const casinoEmbed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(`${getSafeEmoji('casino', client, false)} Dinar TN Casino | كازينو دينار تونسي`)
      .setDescription('Gamble your DT for a chance to win huge XP boosts!')
      .setFooter({ text: 'Community Zone • Luck & Games' });

    const rowCasino = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('casino_spin_boost').setLabel('Spin XP Boost Wheel').setEmoji(getSafeEmoji('casino', client, true)).setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [shopEmbed], components: [rowCrates, rowRoles, rowOther] });
    await channel.send({ embeds: [casinoEmbed], components: [rowCasino] });

    return interaction.editReply({ content: `✅ Economy panels successfully deployed in ${channel}.` });
  },
};
