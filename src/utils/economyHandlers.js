const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const economy = require('../managers/economyManager');
const levelingManager = require('../managers/levelingManager');
const settingsManager = require('./settingsManager');
const { fireMilestoneLog } = require('./walletLog');

const STAFF_ROLES = ['1509006817433227354', '1509007108618584144'];

async function notifyStaff(client, guild, embed, pingsContent = '') {
  try {
    const settings = settingsManager.loadSettings();
    const logChannelId = settings.logsChannelId || settings.adminPanelChannelId;
    if (!logChannelId) return;

    const channel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({
        content: pingsContent ? `${pingsContent}\n🔔 **إشعار الإدارة والمشرفين:**` : '🔔 **إشعار الإدارة:**',
        embeds: [embed],
        allowedMentions: { roles: STAFF_ROLES }
      }).catch(() => null);
    }
  } catch (err) {
    console.error('[ECONOMY STAFF LOG] Error sending notification:', err);
  }
}

module.exports = {
  async handleInteraction(client, interaction) {
    const { customId, guild, user, guildId } = interaction;
    if (!customId) return;

    // ─── 1. Persistent Shop Interactions (Buttons & Dropdowns) ─────────────────────────
    if (customId.startsWith('shop_buy_')) {
      let value;
      if (interaction.isStringSelectMenu()) {
        value = interaction.values[0];
      } else if (interaction.isButton()) {
        value = customId.replace('shop_buy_', '');
        // Map shorthand button IDs to internal keys
        const mapping = {
          'boost': 'xp_boost_x2_24h',
          'custom_name': 'custom_role_name',
          'crate_common': 'crate_common',
          'crate_rare': 'crate_rare',
          'crate_epic': 'crate_epic',
          'crate_legendary': 'crate_legendary',
          'crate_mythic': 'crate_mythic',
          'role_diamond': 'role_diamond',
          'role_vip': 'role_vip'
        };
        value = mapping[value] || value;
      }

      if (!value) return;

      const item = economy.SHOP_ITEMS[value];
      if (!item) return;

      const bal = economy.getBalance(guildId, user.id);

      if (bal < item.price) {
        return interaction.reply({
          content: `❌ رصيدك غير كافٍ! رصيدك: **${bal.toLocaleString()} DT** / المطلوب: **${item.price.toLocaleString()} DT**`,
          ephemeral: true
        });
      }

      // Custom Role Name → show Modal
      if (value === 'custom_role_name') {
        const modal = new ModalBuilder()
          .setCustomId('shop_modal_custom_role')
          .setTitle('✨ طلب اسم رتبة مخصصة');
        const nameInput = new TextInputBuilder()
          .setCustomId('role_name_input')
          .setLabel('ما هو الاسم الذي تريده للرتبة؟')
          .setPlaceholder('مثال: 𝓚𝓘𝓝𝓖')
          .setStyle(TextInputStyle.Short)
          .setMinLength(2).setMaxLength(30).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        return interaction.showModal(modal);
      }

      await interaction.deferReply({ ephemeral: true });

      // ── Crates ────────────────────────────────────────────────
      if (item.category === 'crate') {
        economy.removeBalance(guildId, user.id, item.price, `شراء ${item.name}`);
        const reward = economy.rollCrate(item.id);
        if (!reward) return interaction.editReply({ content: '❌ حدث خطأ أثناء فتح الصندوق.' });

        const userData = levelingManager.getUserData(guildId, user.id) || { xp: 0 };
        levelingManager.setUserXp(guildId, user.id, (userData.xp || 0) + reward.xp);
        const newBal = economy.getBalance(guildId, user.id);

        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle(`🎊 تم فتح ${item.name}!`)
            .setDescription(
              `🎁 **حصلت على:** \`${reward.xp.toLocaleString()} XP\`\n\n` +
              `⭐ **إجمالي الـ XP:** \`${((userData.xp || 0) + reward.xp).toLocaleString()}\`\n` +
              `💰 **رصيدك المتبقي:** \`${newBal.toLocaleString()} DT\``
            ).setTimestamp()]
        });

        await notifyStaff(client, guild, new EmbedBuilder()
          .setColor(0x10B981).setTitle('📦 فتح صندوق مكافآت')
          .addFields(
            { name: 'المشتري', value: `<@${user.id}> (${user.tag})`, inline: true },
            { name: 'الصندوق', value: item.name, inline: true },
            { name: 'الجائزة', value: `\`${reward.xp.toLocaleString()} XP\``, inline: true }
          ).setTimestamp());
        return;
      }

      // ── XP Boosts ─────────────────────────────────────────────
      if (item.category === 'boost') {
        economy.removeBalance(guildId, user.id, item.price, `شراء ${item.name}`);
        const boostExpiresAt = economy.addBoost(guildId, user.id, item.boost.multiplier, item.boost.durationMs, item.name);
        const newBal = economy.getBalance(guildId, user.id);
        const expiresAt = Math.floor(boostExpiresAt / 1000);

        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xF59E0B).setTitle('⚡ تم تفعيل XP Boost!')
            .setDescription(`🚀 **${item.name}** فعّال الآن!\n⏰ **ينتهي:** <t:${expiresAt}:R>\n💰 **رصيدك المتبقي:** \`${newBal.toLocaleString()} DT\``)
            .setTimestamp()]
        });

        const pings = STAFF_ROLES.map(r => `<@&${r}>`).join(' ');
        await notifyStaff(client, guild, new EmbedBuilder()
          .setColor(0xF59E0B).setTitle('⚡ شراء XP Boost')
          .addFields(
            { name: 'المشتري', value: `<@${user.id}> (${user.tag})`, inline: true },
            { name: 'النوع', value: item.name, inline: true },
            { name: 'السعر', value: `\`${item.price.toLocaleString()} DT\``, inline: true }
          ).setTimestamp(), pings);
        return;
      }

      // ── Exclusive Roles ───────────────────────────────────────
      if (item.category === 'role') {
        const roleId = economy.getRoleId(guildId, item.roleKey);
        if (!roleId) return interaction.editReply({ content: `❌ رتبة **${item.name}** غير مُعدَّة بعد. يرجى إبلاغ الإدارة!` });

        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.editReply({ content: '❌ الرتبة غير موجودة في السيرفر! يرجى إبلاغ الإدارة.' });

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member?.roles.cache.has(roleId)) return interaction.editReply({ content: `⚠️ أنت تمتلك رتبة **${item.name}** بالفعل!` });

        economy.removeBalance(guildId, user.id, item.price, `شراء ${item.name}`);
        await member.roles.add(role, `Shop purchase: ${item.name}`).catch(() => null);
        const newBal = economy.getBalance(guildId, user.id);

        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x10B981).setTitle('🎖️ تم شراء الرتبة بنجاح!')
            .setDescription(`🎉 مبروك! حصلت على رتبة **${role.name}**!\n💰 **رصيدك المتبقي:** \`${newBal.toLocaleString()} DT\``)
            .setTimestamp()]
        });

        const pings = STAFF_ROLES.map(r => `<@&${r}>`).join(' ');
        await notifyStaff(client, guild, new EmbedBuilder()
          .setColor(0x10B981).setTitle('🎖️ شراء رتبة حصرية')
          .addFields(
            { name: 'المشتري', value: `<@${user.id}> (${user.tag})`, inline: true },
            { name: 'الرتبة', value: `<@&${role.id}>`, inline: true },
            { name: 'السعر', value: `\`${item.price.toLocaleString()} DT\``, inline: true }
          ).setTimestamp(), pings);
        return;
      }
    }

    // ─── 2. Custom Role Modal Submission ──────────────────────
    if (interaction.isModalSubmit() && customId === 'shop_modal_custom_role') {
      const roleName = interaction.fields.getTextInputValue('role_name_input');
      const item = economy.SHOP_ITEMS['custom_role_name'];
      if (!item) return;

      const bal = economy.getBalance(guildId, user.id);
      if (bal < item.price) return interaction.reply({ content: '❌ عذراً، لم يعد لديك رصيد كافٍ!', ephemeral: true });

      economy.removeBalance(guildId, user.id, item.price, `شراء ${item.name} - الاسم: ${roleName}`);
      const newBal = economy.getBalance(guildId, user.id);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x8B5CF6).setTitle('✨ تم تقديم طلبك بنجاح!')
          .setDescription(
            `تم خصم **${item.price.toLocaleString()} DT** من رصيدك.\n\n` +
            `📝 **الاسم المطلوب:** \`${roleName}\`\n\n` +
            `📨 تم إخطار الإدارة وسيتم إنشاؤها لك قريباً!\n` +
            `💰 **رصيدك المتبقي:** \`${newBal.toLocaleString()} DT\``
          ).setTimestamp()],
        ephemeral: true
      });

      const pings = STAFF_ROLES.map(r => `<@&${r}>`).join(' ');
      await notifyStaff(client, guild, new EmbedBuilder()
        .setColor(0x8B5CF6).setTitle('✨ طلب رتبة مخصصة جديدة')
        .setDescription('قام عضو بشراء رتبة مخصصة ويرغب في الاسم التالي:')
        .addFields(
          { name: 'العضو', value: `<@${user.id}> (${user.tag})`, inline: true },
          { name: 'الاسم المطلوب', value: `\`${roleName}\``, inline: true },
          { name: 'السعر', value: `\`${item.price.toLocaleString()} DT\``, inline: true }
        ).setTimestamp(), pings);
      return;
    }

    // ─── 3. Casino XP Boost Spin (persistent panel button) ───
    if (interaction.isButton() && customId === 'casino_spin_boost') {
      const BOOST_COOLDOWN_MS = 24 * 60 * 60 * 1000;
      const remaining = economy.getRemainingCooldown(guildId, user.id, 'casino_boost', BOOST_COOLDOWN_MS);

      if (remaining > 0) {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        return interaction.reply({
          content: `⏳ يجب الانتظار **${h}h ${m}m** قبل المحاولة التالية! (Cooldown: 24 ساعة)`,
          ephemeral: true
        });
      }

      const bal = economy.getBalance(guildId, user.id);
      if (bal < economy.CASINO_ROLE_PRICE) {
        return interaction.reply({
          content: `❌ رصيدك غير كافٍ! سعر الدورة: **${economy.CASINO_ROLE_PRICE} DT** / رصيدك: **${bal.toLocaleString()} DT**`,
          ephemeral: true
        });
      }

      // Block spin if user already has an active XP boost
      const activeBoost = economy.getActiveBoost(guildId, user.id);
      if (activeBoost) {
        const boostExpiresTs = Math.floor(activeBoost.expiresAt / 1000);
        return interaction.reply({
          content: `⚡ لديك بالفعل Boost نشط: **${activeBoost.name}**!\n⏰ ينتهي: <t:${boostExpiresTs}:R>\n\n❌ لا يمكنك الدوران حتى ينتهي الـ Boost الحالي.`,
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      economy.removeBalance(guildId, user.id, economy.CASINO_ROLE_PRICE, 'Casino XP Boost Gamble');
      economy.setCooldown(guildId, user.id, 'casino_boost');

      // Spin animation
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x6366F1)
          .setTitle('🎲 كازينو الـ XP Boost')
          .setDescription('🎰 تدور عجلة الـ XP Boost...\n\n`[ ▓ ▓ ▓ ░ ░ ]`')
          .setTimestamp()]
      });

      await new Promise(r => setTimeout(r, 1500));

      // Roll the XP boost prize
      const rolled = economy.rollCasinoXpBoost();

      // 20% nothing — user loses their bet (DT already deducted)
      if (!rolled) {
        const lostBal = economy.getBalance(guildId, user.id);
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xEF4444).setTitle('🎰 عجلة الـ XP Boost — لا شيء!')
            .setDescription(
              `😔 **حظك سيئ هذه المرة!** خسرت **${economy.CASINO_ROLE_PRICE} DT** ولم تربح شيئاً.\n` +
              `💰 **رصيدك الحالي:** \`${lostBal.toLocaleString()} DT\`\n\n` +
              `> جرب حظك مرة أخرى بعد 24 ساعة!`
            ).setTimestamp()]
        });
        return;
      }

      const boostExpiresAt = economy.addBoost(guildId, user.id, rolled.multiplier, rolled.durationMs, rolled.name);
      const newBal = economy.getBalance(guildId, user.id);
      const expiresAt = Math.floor(boostExpiresAt / 1000);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x10B981).setTitle('🎰 عجلة الـ XP Boost — النتيجة!')
          .setDescription(
            `🥳 مبروك! لقد فزت بـ: **${rolled.name}**!\n` +
            `⏰ **ينتهي:** <t:${expiresAt}:R>\n` +
            `⚡ سيتم مضاعفة نقاط الـ XP المكتسبة تلقائياً!\n\n` +
            `💰 **رصيدك الجديد:** \`${newBal.toLocaleString()} DT\``
          ).setTimestamp()]
      });

      await notifyStaff(client, guild, new EmbedBuilder()
        .setColor(0x6366F1).setTitle('🎰 فوز في كازينو الـ XP Boost')
        .addFields(
          { name: 'اللاعب', value: `<@${user.id}> (${user.tag})`, inline: true },
          { name: 'المكافأة', value: rolled.name, inline: true }
        ).setTimestamp());
      return;
    }
  }
};
