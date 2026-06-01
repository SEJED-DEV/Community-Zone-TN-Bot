const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupeconomy')
    .setDescription('⚙️ [Admin] أرسل لوحات المتجر والكازينو الدائمة إلى القنوات.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('shop_channel')
         .setDescription('القناة الكتابية التي ستُرسل إليها لوحة المتجر الدائمة')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('casino_channel')
         .setDescription('القناة الكتابية التي ستُرسل إليها لوحة الكازينو الدائمة')
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(false)
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const shopChannel   = interaction.options.getChannel('shop_channel');
    const casinoChannel = interaction.options.getChannel('casino_channel');

    if (!shopChannel && !casinoChannel) {
      return interaction.editReply({ content: '❌ يرجى تحديد قناة واحدة على الأقل!' });
    }

    let resultMsg = '⚙️ **تم تهيئة القنوات الاقتصادية بنجاح:**\n';

    // ── 1. Deploy Persistent Shop Panel ──────────────────────────────────────────
    if (shopChannel) {
      const shopEmbed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('🏪 متجر Dinar TN الشامل')
        .setDescription(
          `مرحباً بك في متجر السيرفر الدائم! يمكنك شراء جميع المكافآت والحصول عليها تلقائياً باستخدام رصيدك من **Dinar TN (DT)**.\n\n` +
          `💰 لمعرفة رصيدك الحالي اكتب: \`/balance\`\n\n` +
          `──────────────────────────────\n` +
          `⚡ **1. مضاعفات الـ XP (XP Boosts):**\n` +
          `• **XP Boost ×2 (24h)** — \`3,000 DT\`\n` +
          `> يضاعف جميع نقاط الخبرة المكتسبة في الشات والرومات الصوتية تلقائياً.\n\n` +
          `✨ **2. المكافآت المخصصة (Custom Rewards):**\n` +
          `• **Custom Role Name** — \`3,500 DT\`\n` +
          `> اطلب اسم رتبة مخصص بالكامل من المشرفين والمسؤولين.\n\n` +
          `📦 **3. صناديق مكافآت الـ XP (Loot Boxes):**\n` +
          `• **Common Crate** (200 DT) | **Rare Crate** (500 DT) | **Epic Crate** (1,000 DT)\n` +
          `• **Legendary Crate** (2,000 DT) | **Mythic Crate** (5,000 DT)\n` +
          `> افتح الصناديق واربح كميات ضخمة من نقاط الـ XP فوراً!\n\n` +
          `👑 **4. الرتب الصوتية الحصرية (Exclusive Voice Roles):**\n` +
          `• 💎 **Diamond** (15,000 DT) | 👑 **VIP** (60,000 DT)\n` +
          `> تمنحك دخول قنوات ورومات صوتية حصرية وصلاحية VIP لنقل الأعضاء!`
        )
        .setFooter({ text: 'Community Zone • Dinar TN Economy' })
        .setTimestamp();

      const rowCrates = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('shop_buy_crate')
          .setPlaceholder('📦 شراء وفتح صناديق الـ XP...')
          .addOptions([
            { label: '📦 Common Crate — 200 DT',     value: 'crate_common',    description: 'يمنح 500 – 1,000 XP' },
            { label: '🎁 Rare Crate — 500 DT',       value: 'crate_rare',      description: 'يمنح 1,500 – 3,000 XP' },
            { label: '💎 Epic Crate — 1,000 DT',      value: 'crate_epic',      description: 'يمنح 4,000 – 8,000 XP' },
            { label: '🔥 Legendary Crate — 2,000 DT', value: 'crate_legendary', description: 'يمنح 10,000 – 20,000 XP' },
            { label: '👑 Mythic Crate — 5,000 DT',    value: 'crate_mythic',    description: 'يمنح 30,000 – 60,000 XP' },
          ])
      );

      const rowRoles = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('shop_buy_role')
          .setPlaceholder('👑 شراء الرتب الصوتية الحصرية...')
          .addOptions([
            { label: '💎 Diamond Role — 15,000 DT',  value: 'role_diamond' },
            { label: '👑 VIP Role — 60,000 DT',    value: 'role_vip', description: 'رومات VIP ونقل الأعضاء' },
          ])
      );

      const rowOther = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('shop_buy_other')
          .setPlaceholder('⚡ شراء الـ XP Boosts والرتب المخصصة...')
          .addOptions([
            { label: '⚡ XP Boost ×2 (24h) — 3,000 DT', value: 'xp_boost_x2_24h', description: 'مضاعفة XP لمدة 24 ساعة' },
            { label: '✨ Custom Role Name — 3,500 DT',   value: 'custom_role_name', description: 'طلب اسم رتبة مخصص' },
          ])
      );

      await shopChannel.send({ embeds: [shopEmbed], components: [rowCrates, rowRoles, rowOther] }).catch(() => null);
      resultMsg += `✅ تم إرسال لوحة المتجر الدائمة إلى <#${shopChannel.id}>\n`;
    }

    // ── 2. Deploy Persistent Casino Panel (XP Boost only) ────────────────────────
    if (casinoChannel) {
      const casinoEmbed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🎰 كازينو Dinar TN — عجلة الـ XP Boost')
        .setDescription(
          `مرحباً بك في كازينو السيرفر الدائم!\n\n` +
          `💰 لمعرفة رصيدك الحالي اكتب: \`/balance\`\n\n` +
          `──────────────────────────────\n` +
          `⚡ **عجلة مضاعفات الـ XP (XP Boost Gamble):**\n` +
          `• **سعر الدورة:** \`350 DT\`\n` +
          `• **Cooldown:** مرة واحدة كل **24 ساعة**\n\n` +
          `**🎯 الجوائز ونسب الفوز:**\n` +
          `> ⚡ XP ×2 (1h) — **20%**\n` +
          `> ⚡ XP ×2 (2h) — **25%**\n` +
          `> ⚡ XP ×2 (4h) — **25%**\n` +
          `> ⚡ XP ×1.5 (24h) — **10%**\n` +
          `> ❌ لا شيء (خسارة) — **20%**\n\n` +
          `> الـ XP Boost يطبق تلقائياً على الشات والرومات الصوتية!`
        )
        .setFooter({ text: 'Community Zone • Dinar TN Casino — حظ سعيد!' })
        .setTimestamp();

      const rowCasino = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('casino_spin_boost')
          .setLabel('⚡ دور عجلة الـ XP Boost (350 DT)')
          .setStyle(ButtonStyle.Primary)
      );

      await casinoChannel.send({ embeds: [casinoEmbed], components: [rowCasino] }).catch(() => null);
      resultMsg += `✅ تم إرسال لوحة الكازينو الدائمة إلى <#${casinoChannel.id}>\n`;
    }

    return interaction.editReply({ content: resultMsg });
  },
};
