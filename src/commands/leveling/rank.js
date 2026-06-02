const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const levelingManager = require('../../managers/levelingManager');
const config = require('../../config');
const { getSafeEmoji } = require('../../utils/emojiHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your rank card and XP progress.')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('Check another user\'s rank (leave empty for yourself).')
        .setRequired(false)
    ),

  async execute(client, interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const userData = levelingManager.getUserData(guildId, target.id);

    if (!userData || userData.xp === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xEF4444)
            .setDescription(`${getSafeEmoji('error', client, false)} **${target.username}** hasn't earned any XP yet!`)
            .setFooter({ text: 'Community Zone • Leveling System • Dev by sejed.dev & akaza_senior' }),
        ],
      });
    }

    const rank = levelingManager.getUserRank(guildId, target.id);
    const progress = levelingManager.xpProgress(userData.xp);
    const milestone = levelingManager.getMilestoneForLevel(userData.level);

    // Build progress bar
    const pct = progress.nextLevelXp > 0
      ? (progress.currentLevelXp / progress.nextLevelXp)
      : 1;
    const filled = Math.round(pct * 12);
    const bar = '█'.repeat(filled) + '░'.repeat(12 - filled);

    // Get the member's current milestone role if any
    let member;
    try {
      member = await interaction.guild.members.fetch(target.id);
    } catch (_) { /* Member may have left */ }

    const currentRoleName = milestone ? milestone.name : null;
    let currentRole = null;
    if (currentRoleName && member) {
      currentRole = member.roles.cache.find(r => r.name === currentRoleName);
    }

    const nextMilestone = levelingManager
      .getAllMilestones()
      .find(m => m.level > userData.level);

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setAuthor({
        name: `${target.username}'s Rank Card`,
        iconURL: target.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: `${getSafeEmoji('rank', client, false)} Server Rank`,
          value: `**#${rank}**`,
          inline: true,
        },
        {
          name: `${getSafeEmoji('level', client, false)} Level`,
          value: `**${userData.level}** / ${levelingManager.MAX_LEVEL}`,
          inline: true,
        },
        {
          name: `${getSafeEmoji('xp', client, false)} Total XP`,
          value: `**${userData.xp.toLocaleString()}** XP`,
          inline: true,
        },
        {
          name: '📊 Progress to Next Level',
          value:
            userData.level >= levelingManager.MAX_LEVEL
              ? '`[████████████]` **MAX LEVEL REACHED!** 🌟'
              : `\`[${bar}]\` ${progress.currentLevelXp.toLocaleString()} / ${progress.nextLevelXp.toLocaleString()} XP`,
          inline: false,
        },
        {
          name: '🎖️ Current Role',
          value: currentRole
            ? `<@&${currentRole.id}>`
            : milestone
            ? `${milestone.name} *(role not found — ask an admin to create it)*`
            : '`None yet` — reach **Level 5** to earn your first role!',
          inline: true,
        },
        {
          name: '⏭️ Next Milestone',
          value: nextMilestone
            ? `Level **${nextMilestone.level}** ${nextMilestone.emoji}`
            : '🌟 Max milestone reached!',
          inline: true,
        }
      )
      .setFooter({ text: 'Community Zone • Leveling System • Dev by sejed.dev & akaza_senior' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
