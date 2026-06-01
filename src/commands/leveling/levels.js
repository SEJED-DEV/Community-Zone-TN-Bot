const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const levelingManager = require('../../managers/levelingManager');
const config = require('../../config');

const ROLES_PER_PAGE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('View all level milestone roles and their XP requirements.'),

  async execute(client, interaction) {
    const milestones = levelingManager.getAllMilestones();
    const totalPages = Math.ceil(milestones.length / ROLES_PER_PAGE);

    // Calculate the XP needed to REACH each milestone level
    const xpCumulative = (level) => {
      let total = 0;
      for (let l = 1; l <= level; l++) {
        total += levelingManager.xpForLevel(l);
      }
      return total;
    };

    const buildEmbed = (page) => {
      const start = page * ROLES_PER_PAGE;
      const slice = milestones.slice(start, start + ROLES_PER_PAGE);

      const rows = slice
        .map(m => {
          const xpNeeded = xpCumulative(m.level).toLocaleString();
          return `${m.emoji} **${m.name}** — Reach Level \`${m.level}\` *(~${xpNeeded} XP)*`;
        })
        .join('\n');

      return new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('🎖️ Community Zone — Level Milestone Roles')
        .setDescription(
          `Earn XP by chatting to level up! Milestone roles are awarded **every 5 levels**.\n` +
          `You always hold **only one** level role — it upgrades automatically.\n\n` +
          rows
        )
        .addFields(
          {
            name: '📊 XP Formula',
            value: '`XP needed = 5 × level² + 50 × level + 100` (per level)',
            inline: false,
          },
          {
            name: '⏱️ Cooldown',
            value: '`15 seconds` between XP gains  ·  `15–25 XP` per message',
            inline: true,
          },
          {
            name: '🏆 Max Level',
            value: '`250` — Ultimate milestone: **Level 250 🌟**',
            inline: true,
          }
        )
        .setFooter({
          text: `Page ${page + 1} / ${totalPages} • ${milestones.length} total milestones • Community Zone Leveling`,
        })
        .setTimestamp();
    };

    const { getSafeEmoji } = require('../../utils/emojiHelper');
    const buildButtons = (page) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('levels_prev')
          .setLabel('Previous')
          .setEmoji(getSafeEmoji('arrow_left', client, true))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('levels_next')
          .setLabel('Next')
          .setEmoji(getSafeEmoji('arrow', client, true))
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1)
      );
      return row;
    };

    let currentPage = 0;
    const reply = await interaction.reply({
      embeds: [buildEmbed(currentPage)],
      components: totalPages > 1 ? [buildButtons(currentPage)] : [],
      fetchReply: true,
    });

    if (totalPages <= 1) return;

    // Collector: 2-minute timeout, only the original user can paginate
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.customId === 'levels_prev') currentPage = Math.max(0, currentPage - 1);
      if (btnInteraction.customId === 'levels_next') currentPage = Math.min(totalPages - 1, currentPage + 1);

      await btnInteraction.update({
        embeds: [buildEmbed(currentPage)],
        components: [buildButtons(currentPage)],
      });
    });

    collector.on('end', async () => {
      // Disable buttons after timeout
      try {
        await reply.edit({ components: [buildButtons(-99)] }); // All disabled
      } catch (_) {}
    });
  },
};
