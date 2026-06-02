const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const path = require('path');
const economy = require('../../managers/economyManager');
const config = require('../../config');

const BANNER_PATH = path.join(__dirname, '..', '..', '..', 'dinari danous.png');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('🏪 Central Server Shop | متجر السيرفر الموحد'),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: false });

    const { guildId, user } = interaction;
    const bal = economy.getBalance(guildId, user.id);

    const attachment = require('fs').existsSync(BANNER_PATH)
      ? new AttachmentBuilder(BANNER_PATH, { name: 'dinar.png' })
      : null;

    const { getSafeEmoji } = require('../../utils/emojiHelper');

    const shopEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle(`${getSafeEmoji('shop', client, false)} Dinar TN Central Shop | متجر دينار تونسي`)
      .setDescription(
        `Welcome to the central shop! Use your **Dinar TN (DT)** to buy exclusive rewards.\n` +
        `أهلاً بك في متجر السيرفر الموحد! استخدم عملتك لشراء المكافآت الحصرية.\n\n` +
        `💰 **Your Balance:** \`${bal.toLocaleString()} DT\``
      )
      .addFields(
        {
          name: '📦 XP Loot Boxes',
          value: '• **Common** (25 DT)\n• **Rare** (75 DT)\n• **Epic** (150 DT)\n• **Legendary** (300 DT)\n• **Mythic** (750 DT)',
          inline: true
        },
        {
          name: '👑 Roles & Boosts',
          value: '• **XP Boost x2** (1,000 DT)\n• **Custom Role** (1,000 DT)\n• **Diamond Role** (2,500 DT)\n• **VIP Role** (10,000 DT)',
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Community Zone • Economy System • Dev by sejed.dev & akaza_senior' });

    if (attachment) shopEmbed.setImage('attachment://dinar.png');

    // Row 1: Crates (Common, Rare, Epic)
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_buy_crate_common').setLabel('Common').setEmoji('📦').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop_buy_crate_rare').setLabel('Rare').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop_buy_crate_epic').setLabel('Epic').setEmoji('💎').setStyle(ButtonStyle.Secondary)
    );

    // Row 2: Crates (Legendary, Mythic)
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_buy_crate_legendary').setLabel('Legendary').setEmoji('🔥').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop_buy_crate_mythic').setLabel('Mythic').setEmoji('👑').setStyle(ButtonStyle.Secondary)
    );

    // Row 3: Boosts & Roles
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_buy_boost').setLabel('XP Boost x2').setEmoji(getSafeEmoji('xp', client, true)).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_buy_custom_name').setLabel('Custom Role').setEmoji(getSafeEmoji('owner', client, true)).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('shop_buy_role_diamond').setLabel('Diamond').setEmoji(getSafeEmoji('dot', client, true)).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('shop_buy_role_vip').setLabel('VIP').setEmoji(getSafeEmoji('owner', client, true)).setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      embeds: [shopEmbed],
      files: attachment ? [attachment] : [],
      components: [row1, row2, row3],
    });
  },
};
