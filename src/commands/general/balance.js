const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const economy = require('../../managers/economyManager');
const levelingManager = require('../../managers/levelingManager');

const BANNER_PATH = path.join(__dirname, '..', '..', '..', 'dinari danous.png');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 اعرض رصيدك من Dinar TN أو رصيد عضو آخر.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('العضو الذي تريد رؤية رصيده (اختياري)').setRequired(false)
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser('user') || interaction.user;
    const { guildId } = interaction;

    const bal   = economy.getBalance(guildId, target.id);
    const txs   = economy.getTransactions(guildId, target.id, 5);
    const boost = economy.getActiveBoost(guildId, target.id);
    const lbPos = economy.getLeaderboard(guildId, 100).findIndex(e => e.userId === target.id);
    const xpData = levelingManager.getUserData(guildId, target.id);

    const txLines = txs.length
      ? txs.map(t => {
          const sign  = t.type === 'credit' ? '`+`' : t.type === 'debit' ? '`-`' : '`=`';
          const color = t.type === 'credit' ? '🟢' : t.type === 'debit' ? '🔴' : '🔵';
          const ts    = `<t:${Math.floor(t.ts / 1000)}:R>`;
          return `${color} ${sign} **${t.amount.toLocaleString()} DT** — ${t.reason} ${ts}`;
        }).join('\n')
      : '*لا توجد معاملات بعد.*';

    const attachment = require('fs').existsSync(BANNER_PATH)
      ? new AttachmentBuilder(BANNER_PATH, { name: 'dinar.png' })
      : null;

    const embed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setAuthor({ name: `💰 رصيد ${target.username}`, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💰 الرصيد الحالي',    value: `\`${bal.toLocaleString()} DT\``,                       inline: true  },
        { name: '🏆 الترتيب',           value: lbPos >= 0 ? `\`#${lbPos + 1}\`` : '`—`',                inline: true  },
        { name: '⭐ مستوى XP',          value: xpData ? `\`Level ${xpData.level}\`` : '`0`',            inline: true  },
        { name: '⚡ XP Boost النشط',
          value: boost
            ? `\`×${boost.multiplier}\` — ${boost.name} (ينتهي <t:${Math.floor(boost.expiresAt / 1000)}:R>)`
            : '`لا يوجد Boost نشط`',
          inline: false,
        },
        { name: '📜 آخر المعاملات', value: txLines, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Community Zone • Dinar TN Economy' });

    if (attachment) embed.setImage('attachment://dinar.png');

    await interaction.editReply({
      embeds: [embed],
      files: attachment ? [attachment] : [],
    });
  },
};
