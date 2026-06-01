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
const { CASINO_ROLE_PRICE } = require('../../managers/economyManager');

const BANNER_PATH = path.join(__dirname, '..', '..', '..', 'dinari danous.png');

const BOOST_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h cooldown for XP Boost Gamble

function buildCasinoHome(guildId, userId) {
  const bal = economy.getBalance(guildId, userId);
  const cooldownBoost = economy.getRemainingCooldown(guildId, userId, 'casino_boost', BOOST_COOLDOWN_MS);

  function fmt(ms) {
    if (ms <= 0) return '✅ متاح الآن';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `⏳ ${h}h ${m}m`;
  }

  return new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('🎰 كازينو دينار تونسي — عجلة الـ XP Boost')
    .setDescription(
      `> 💰 **رصيدك:** \`${bal.toLocaleString()} DT\`\n\n` +
      `**⚡ XP Boost Gamble** — \`${CASINO_ROLE_PRICE} DT\`\n` +
      `> اربح XP Boost عشوائي يضاعف نقاط خبرتك تلقائياً!\n\n` +
      `**🎯 الجوائز ونسب الفوز:**\n` +
      `> ⚡ XP ×2 (1h) — **20%**\n` +
      `> ⚡ XP ×2 (2h) — **25%**\n` +
      `> ⚡ XP ×2 (4h) — **25%**\n` +
      `> ⚡ XP ×1.5 (24h) — **10%**\n` +
      `> ❌ لا شيء (خسارة) — **20%**\n\n` +
      `> ⏱️ Cooldown: **${fmt(cooldownBoost)}** (كل 24 ساعة)`
    )
    .setFooter({ text: 'Community Zone • Dinar TN Casino — حظ سعيد!' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('🎰 كازينو Dinar TN — جرب حظك واربح XP Boost!'),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: false });

    const { guildId, user } = interaction;

    const attachment = require('fs').existsSync(BANNER_PATH)
      ? new AttachmentBuilder(BANNER_PATH, { name: 'dinar.png' })
      : null;

    const homeEmbed = buildCasinoHome(guildId, user.id);
    if (attachment) homeEmbed.setImage('attachment://dinar.png');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('casino_spin_boost')
        .setLabel(`⚡ XP Boost Gamble — ${CASINO_ROLE_PRICE} DT`)
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.editReply({
      embeds: [homeEmbed],
      components: [row],
      files: attachment ? [attachment] : [],
    });
    // Button clicks are handled globally by economyHandlers.js
  },
};
