const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');
const levelingManager = require('../../managers/levelingManager');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server XP leaderboard.')
    .addIntegerOption(opt =>
      opt
        .setName('page')
        .setDescription('Page number (10 users per page).')
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(client, interaction) {
    await interaction.deferReply();

    const page = (interaction.options.getInteger('page') || 1) - 1; // 0-indexed
    const PAGE_SIZE = 10;
    const guildId = interaction.guildId;

    // Get full leaderboard for pagination
    const allUsers = levelingManager.getLeaderboard(guildId, 1000);
    const totalPages = Math.max(1, Math.ceil(allUsers.length / PAGE_SIZE));
    const pageUsers = allUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (pageUsers.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xEF4444)
            .setDescription('❌ No XP data found for this server yet. Start chatting to earn XP!')
            .setFooter({ text: 'Community Zone • Leveling System' }),
        ],
      });
    }

    // Fetch usernames from Discord cache or API (batch-safe)
    const lines = await Promise.all(
      pageUsers.map(async (entry, i) => {
        const rank = page * PAGE_SIZE + i + 1;
        const medal = rank <= 3 ? MEDALS[rank - 1] : `\`#${rank}\``;

        let displayName = `<@${entry.userId}>`;
        try {
          const member = interaction.guild.members.cache.get(entry.userId);
          if (member) displayName = `**${member.displayName}**`;
        } catch (_) {}

        const milestone = levelingManager.getMilestoneForLevel(entry.level);
        const roleLabel = milestone ? milestone.emoji : '·';

        return `${medal} ${displayName} — Lvl **${entry.level}** ${roleLabel} · \`${entry.xp.toLocaleString()} XP\``;
      })
    );

    // Highlight the requesting user's rank if they are on this page
    const callerRank = levelingManager.getUserRank(guildId, interaction.user.id);
    const callerData = levelingManager.getUserData(guildId, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(`🏆 Community Zone — XP Leaderboard`)
      .setDescription(lines.join('\n'))
      .setFooter({
        text: `Page ${page + 1} / ${totalPages} • Community Zone • Leveling System`,
      })
      .setTimestamp();

    if (callerData) {
      embed.addFields({
        name: '📍 Your Rank',
        value: `#${callerRank} • Level **${callerData.level}** • \`${callerData.xp.toLocaleString()} XP\``,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
