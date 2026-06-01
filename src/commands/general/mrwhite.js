const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mrWhiteManager = require('../../managers/mrWhiteManager');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mrwhite')
    .setDescription('🎮 Mr. White Voice Edition by akaza_senior')
    .addSubcommand(sub =>
      sub.setName('play')
         .setDescription('أنشئ لوبي جديد للعبة Mr. White الاجتماعية الصوتية.')
    )
    .addSubcommand(sub =>
      sub.setName('stats')
         .setDescription('عرض إحصائيات لعبة Mr. White.')
         .addUserOption(opt =>
           opt.setName('user')
              .setDescription('المستخدم الذي تريد عرض إحصائياته.')
              .setRequired(false)
         )
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
         .setDescription('عرض لوحة المتصدرين لهذا السيرفر.')
    ),

  async execute(client, interaction) {
    const subcommand = interaction.options.getSubcommand();

    // ═══════════════════════════════════════════
    // SUBCOMMAND: STATS
    // ═══════════════════════════════════════════
    if (subcommand === 'stats') {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const stats = mrWhiteManager.getUserStats(interaction.guildId, targetUser.id);
      const winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;

      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setAuthor({
          name: `📊 إحصائيات Mr. White — ${targetUser.username}`,
          iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .setDescription(
          `هنا إحصائيات مبارياتك المسجلة في لعبة **Mr. White Voice Edition**:\n\u200b`
        )
        .addFields(
          { name: '🎮 عدد المباريات',       value: `\`${stats.games}\``,   inline: true },
          { name: '🏆 عدد الانتصارات',      value: `\`${stats.wins}\``,    inline: true },
          { name: '💀 عدد الهزائم',         value: `\`${stats.losses}\``,  inline: true },
          { name: '🤫 مرات Mr. White',       value: `\`${stats.asWhite}\``, inline: true },
          { name: '📈 نسبة الفوز',           value: `\`${winRate}%\``,      inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Mr. White Voice Edition • stats' });

      return interaction.editReply({ embeds: [embed] });
    }

    // ═══════════════════════════════════════════
    // SUBCOMMAND: LEADERBOARD
    // ═══════════════════════════════════════════
    if (subcommand === 'leaderboard') {
      await interaction.deferReply();

      const list = mrWhiteManager.getLeaderboard(interaction.guildId, 10);
      if (list.length === 0) {
        return interaction.editReply({
          embeds: [embedGenerator.info(
            'لا توجد إحصائيات مسجلة في هذا السيرفر حالياً.\nالعبوا بعض المباريات لتسجيل النتائج! 🎮',
            '🏆 متصدرون لعبة Mr. White'
          )]
        });
      }

      const medals = ['🥇', '🥈', '🥉'];
      const description = list
        .map((s, idx) => {
          const medal = medals[idx] ?? '🏅';
          return (
            `${medal} **#${idx + 1}** <@${s.userId}>\n` +
            `> 🏆 \`${s.wins}\` فوز  |  🎮 \`${s.games}\` مباراة  |  📈 \`${s.winRate}%\`  |  🤫 \`${s.asWhite}\` مرة Mr. White`
          );
        })
        .join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🏅 لوحة متصدري لعبة Mr. White')
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: 'Mr. White Leaderboard • akaza_senior' });

      return interaction.editReply({ embeds: [embed] });
    }

    // ═══════════════════════════════════════════
    // SUBCOMMAND: PLAY
    // ═══════════════════════════════════════════
    if (subcommand === 'play') {
      // Must be in a voice channel
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({
          embeds: [embedGenerator.error(
            '❌ يجب أن تكون متصلاً بروم صوتي (Voice Channel) لإنشاء اللعبة!',
            'خطأ في الصوت'
          )],
          ephemeral: true
        });
      }

      // Block duplicate games
      const existing = mrWhiteManager.getGame(interaction.guildId);
      if (existing) {
        return interaction.reply({
          embeds: [embedGenerator.warning(
            `⚠️ هناك مباراة نشطة بالفعل في هذا السيرفر داخل الروم الصوتي <#${existing.voiceChannelId}>.\n` +
            `يجب إنهاء المباراة السابقة قبل بدء مباراة جديدة.`,
            'مباراة نشطة'
          )],
          ephemeral: true
        });
      }

      await interaction.deferReply();

      // Create new game session
      const game = mrWhiteManager.createGame(
        interaction.guildId,
        voiceChannel.id,
        interaction.channelId,
        interaction.user.id,
        interaction.user.tag
      );

      // Auto-join the host
      game.players.set(interaction.user.id, {
        userId: interaction.user.id,
        tag: interaction.user.tag,
        role: 'CITIZEN',
        active: true,
        viewed: false
      });

      const lobbyEmbed    = mrWhiteManager.getLobbyEmbed(game);
      const hostButtons   = mrWhiteManager.getHostButtons(game);
      const playerButtons = mrWhiteManager.getPlayerButtons(game);

      const message = await interaction.editReply({
        embeds: [lobbyEmbed],
        components: [hostButtons, playerButtons]
      });

      game.gameMessageId = message.id;
    }
  }
};
