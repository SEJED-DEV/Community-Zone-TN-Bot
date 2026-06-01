const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const path = require('path');
const economy = require('../../managers/economyManager');

const BANNER_PATH = path.join(__dirname, '..', '..', '..', 'dinari danous.png');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('🏪 افتح متجر Dinar TN الشامل واشترِ مكافآت حصرية.'),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: false });

    const { guildId, user } = interaction;
    const bal = economy.getBalance(guildId, user.id);

    const attachment = require('fs').existsSync(BANNER_PATH)
      ? new AttachmentBuilder(BANNER_PATH, { name: 'dinar.png' })
      : null;

    const shopEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle('🏪 متجر Dinar TN الشامل')
      .setDescription(
        `أهلاً بك في متجر السيرفر الموحد! يمكنك شراء المكافآت، الصناديق، والرتب الحصرية باستخدام عملتك **Dinar TN (DT)**.\n\n` +
        `💰 **رصيدك الحالي:** \`${bal.toLocaleString()} DT\`\n\n` +
        `──────────────────────────────\n` +
        `⚡ **1. مضاعفات الـ XP (XP Boosts):**\n` +
        `• **XP Boost ×2 (24h)** — \`1,000 DT\`\n` +
        `> يضاعف جميع نقاط الخبرة المكتسبة في الشات والرومات الصوتية لمدة 24 ساعة.\n\n` +
        `✨ **2. المكافآت المخصصة (Custom Rewards):**\n` +
        `• **Custom Role Name** — \`1,000 DT\`\n` +
        `> اطلب اسم رتبة مخصص بالكامل من المشرفين والمسؤولين.\n\n` +
        `📦 **3. صناديق مكافآت الـ XP (Loot Boxes):**\n` +
        `• **Common Crate** (25 DT) | **Rare Crate** (75 DT) | **Epic Crate** (150 DT)\n` +
        `• **Legendary Crate** (300 DT) | **Mythic Crate** (750 DT)\n` +
        `> افتح الصناديق واربح كميات ضخمة من نقاط الـ XP بشكل فوري ومباشر!\n\n` +
        `👑 **4. الرتب الصوتية الحصرية (Exclusive Voice Roles):**\n` +
        `• 💎 **Diamond** (2,500 DT) | 👑 **VIP** (10,000 DT)\n` +
        `> تمنحك دخول قنوات ورومات صوتية حصرية، وصلاحية VIP لنقل الأعضاء بين الغرف!`
      )
      .setTimestamp()
      .setFooter({ text: 'Community Zone • Dinar TN Economy' });

    if (attachment) shopEmbed.setImage('attachment://dinar.png');

    // Build the 3 Action Rows (All in One big panel)
    const rowCrates = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_buy_crate')
        .setPlaceholder('📦 شراء وفتح صناديق الـ XP...')
        .addOptions([
          { label: '📦 Common Crate — 25 DT',     value: 'crate_common',    description: 'يمنح 500 – 1,000 XP' },
          { label: '🎁 Rare Crate — 75 DT',       value: 'crate_rare',      description: 'يمنح 1,500 – 3,000 XP' },
          { label: '💎 Epic Crate — 150 DT',      value: 'crate_epic',      description: 'يمنح 4,000 – 8,000 XP' },
          { label: '🔥 Legendary Crate — 300 DT', value: 'crate_legendary', description: 'يمنح 10,000 – 20,000 XP' },
          { label: '👑 Mythic Crate — 750 DT',    value: 'crate_mythic',    description: 'يمنح 30,000 – 60,000 XP' },
        ])
    );

    const rowRoles = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_buy_role')
        .setPlaceholder('👑 شراء الرتب الصوتية الحصرية...')
        .addOptions([
          { label: '💎 Diamond Role — 2,500 DT', value: 'role_diamond' },
          { label: '👑 VIP Role — 10,000 DT',   value: 'role_vip', description: 'رومات VIP ونقل الأعضاء' },
        ])
    );

    const rowOther = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_buy_other')
        .setPlaceholder('⚡ شراء الـ XP Boosts والرتب المخصصة...')
        .addOptions([
          { label: '⚡ XP Boost ×2 (24h) — 1,000 DT', value: 'xp_boost_x2_24h', description: 'مضاعفة XP لمدة 24 ساعة' },
          { label: '✨ Custom Role Name — 1,000 DT', value: 'custom_role_name', description: 'اسم رتبة مخصص بالكامل' },
        ])
    );

    await interaction.editReply({
      embeds: [shopEmbed],
      files: attachment ? [attachment] : [],
      components: [rowCrates, rowRoles, rowOther],
    });
  },
};
