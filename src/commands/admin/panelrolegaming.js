const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const settingsManager = require('../../utils/settingsManager');

// ============================================================
// 🎮 GAMES CATALOGUE — exactly 14 entries
// id    : must be unique, no spaces (used in Discord customId)
// label : display name on the button
// emoji : shown on the button label
// style : ButtonStyle color (Danger=red, Success=green,
//         Primary=blue, Secondary=grey)
// ============================================================
const GAMES = [
  { id: 'valorant',     label: 'Valorant',          emoji: '🎯', style: ButtonStyle.Danger    },
  { id: 'gta',          label: 'GTA',               emoji: '🚗', style: ButtonStyle.Secondary },
  { id: 'among_us',     label: 'Among Us',          emoji: '👽', style: ButtonStyle.Primary   },
  { id: 'fifa',         label: 'FIFA',              emoji: '⚽', style: ButtonStyle.Success   },
  { id: 'pes',          label: 'PES',               emoji: '🏆', style: ButtonStyle.Success   },
  { id: 'free_fire',    label: 'Free Fire',         emoji: '🔫', style: ButtonStyle.Danger    },
  { id: 'bloodstrike',  label: 'Bloodstrike',       emoji: '💥', style: ButtonStyle.Danger    },
  { id: 'stumble_guys', label: 'Stumble Guys',      emoji: '🤸', style: ButtonStyle.Primary   },
  { id: 'roblox',       label: 'Roblox',            emoji: '🧱', style: ButtonStyle.Primary   },
  { id: 'minecraft',    label: 'Minecraft',         emoji: '⛏️', style: ButtonStyle.Success   },
  { id: 'lol',          label: 'League of Legends', emoji: '⚔️', style: ButtonStyle.Danger    },
  { id: 'brawlhalla',   label: 'Brawlhalla',        emoji: '🥊', style: ButtonStyle.Danger    },
  { id: 'codenames',    label: 'Codenames',         emoji: '🕵️', style: ButtonStyle.Primary   },
  { id: 'other_games',  label: 'Other Games',       emoji: '🎮', style: ButtonStyle.Secondary },
];

// Build up to 5 ActionRows of up to 5 buttons each (Discord max = 25 buttons)
function buildGameRows() {
  const rows = [];
  let currentRow = new ActionRowBuilder();

  for (const game of GAMES) {
    if (currentRow.components.length === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      if (rows.length === 5) break; // Discord hard limit: 5 rows
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`game_role_${game.id}`)
        .setLabel(`${game.emoji} ${game.label}`)
        .setStyle(game.style)
    );
  }

  if (currentRow.components.length > 0 && rows.length < 5) {
    rows.push(currentRow);
  }

  return rows;
}

function buildPanelEmbed(guild) {
  const gameList = GAMES.map(g => `${g.emoji} **${g.label}**`).join('  •  ');

  return new EmbedBuilder()
    .setColor(0x8B5CF6) // Neon Purple
    .setTitle('🎮 Gaming Roles Panel | لوحة أدوار الألعاب')
    .setDescription(
      '> **Click a button below to get or remove your gaming role!**\n' +
      '> **انقر على الزر المقابل للعبتك للحصول على رتبتها أو إزالتها!**\n\n' +
      '```\n' +
      '🟢  Click once  → Role assigned  (أضيفت الرتبة)\n' +
      '🔴  Click again → Role removed   (أُزيلت الرتبة)\n' +
      '```\n\n' +
      `**🕹️ Available Games | الألعاب المتاحة:**\n${gameList}`
    )
    .addFields([
      {
        name: '💡 How it works | كيف يعمل',
        value:
          'Each button **adds or removes** the game role automatically.\n' +
          'كل زر **يضيف أو يزيل** رتبة اللعبة تلقائياً.\n\n' +
          '> If the role does **not exist** yet, the bot will **auto-create** it.\n' +
          '> إذا لم تكن الرتبة موجودة، سيقوم البوت بإنشائها تلقائياً.',
        inline: false,
      },
    ])
    .setThumbnail(guild?.iconURL({ dynamic: true }) ?? null)
    .setTimestamp()
    .setFooter({
      text: 'Community Zone • Dev by Akaza_senior',
      iconURL: guild?.iconURL({ dynamic: true }) ?? undefined,
    });
}

module.exports = {
  // Expose GAMES list so the interaction handler can look up game metadata
  GAMES,
  buildGameRows,
  buildPanelEmbed,

  data: new SlashCommandBuilder()
    .setName('panelrolegaming')
    .setDescription('Deploy or manage the Gaming Role Self-Assignment Panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Send the Gaming Role Panel to a channel.')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('The channel to post the Gaming Role Panel in.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Show current Gaming Role Panel configuration.')
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    // ── /panelrolegaming status ────────────────────────────
    if (sub === 'status') {
      const settings = settingsManager.loadSettings();
      const channelStr = settings.gameRolePanelChannelId
        ? `<#${settings.gameRolePanelChannelId}>`
        : '`Not deployed yet` — run `/panelrolegaming setup`';

      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('🎮 Gaming Role Panel Status | حالة لوحة الألعاب')
        .addFields(
          { name: '📣 Panel Channel | قناة اللوحة', value: channelStr, inline: false },
          { name: '🕹️ Total Games | عدد الألعاب', value: `\`${GAMES.length}\` games configured`, inline: false }
        )
        .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── /panelrolegaming setup ─────────────────────────────
    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');

      const panelEmbed = buildPanelEmbed(interaction.guild);
      const rows = buildGameRows();

      await channel.send({ embeds: [panelEmbed], components: rows });
      settingsManager.saveSettings({ gameRolePanelChannelId: channel.id });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Gaming Role Panel Deployed | تم نشر لوحة الألعاب')
            .setDescription(
              `The Gaming Role Panel has been sent to ${channel}.\n` +
              `تم إرسال لوحة أدوار الألعاب إلى ${channel}.\n\n` +
              `🎮 **${GAMES.length} games** are available for self-assignment.`
            )
            .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
            .setTimestamp(),
        ],
      });
    }
  },
};
