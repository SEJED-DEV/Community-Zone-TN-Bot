const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const economy = require('../../managers/economyManager');

const BANNER_PATH = path.join(__dirname, '..', '..', '..', 'dinari danous.png');
const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboardcasino')
    .setDescription('🏆 اعرض ترتيب أثرى الأعضاء في Dinar TN.')
    .addSubcommand(sub =>
      sub.setName('economy').setDescription('ترتيب الرصيد (DT)')
    )
    .addSubcommand(sub =>
      sub.setName('xp').setDescription('ترتيب XP والمستويات')
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: false });
    const { guildId, guild } = interaction;
    const sub = interaction.options.getSubcommand();

    const attachment = require('fs').existsSync(BANNER_PATH)
      ? new AttachmentBuilder(BANNER_PATH, { name: 'dinar.png' })
      : null;

    if (sub === 'economy') {
      const lb = economy.getLeaderboard(guildId, 10);

      const lines = await Promise.all(
        lb.map(async (entry, idx) => {
          let name = `<@${entry.userId}>`;
          try {
            const member = await guild.members.fetch(entry.userId).catch(() => null);
            if (member) name = member.displayName;
          } catch {}
          const medal = MEDALS[idx] || `${idx + 1}.`;
          return `${medal} **${name}** — \`${entry.balance.toLocaleString()} DT\``;
        })
      );

      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🏆 ترتيب Dinar TN — الرصيد')
        .setDescription(lines.length ? lines.join('\n') : '*لا يوجد بيانات بعد.*')
        .setTimestamp()
        .setFooter({ text: 'Community Zone • Dinar TN Economy' });
      if (attachment) embed.setImage('attachment://dinar.png');

      return interaction.editReply({ embeds: [embed], files: attachment ? [attachment] : [] });
    }

    // XP leaderboard (reuse leveling manager)
    const levelingManager = require('../../managers/levelingManager');
    const xpLb = levelingManager.getLeaderboard(guildId, 10);

    const xpLines = await Promise.all(
      xpLb.map(async (entry, idx) => {
        let name = `<@${entry.userId}>`;
        try {
          const member = await guild.members.fetch(entry.userId).catch(() => null);
          if (member) name = member.displayName;
        } catch {}
        const medal = MEDALS[idx] || `${idx + 1}.`;
        return `${medal} **${name}** — Level \`${entry.level}\` — \`${entry.xp.toLocaleString()} XP\``;
      })
    );

    const xpEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle('🏆 ترتيب XP — المستويات')
      .setDescription(xpLines.length ? xpLines.join('\n') : '*لا يوجد بيانات بعد.*')
      .setTimestamp()
      .setFooter({ text: 'Community Zone • Leveling System' });

    return interaction.editReply({ embeds: [xpEmbed] });
  },
};
