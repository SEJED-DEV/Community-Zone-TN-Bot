const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const economy = require('../../managers/economyManager');
const { getSafeEmoji } = require('../../utils/emojiHelper');

function getWinner(choiceA, choiceB) {
  if (choiceA === choiceB) return 'Tie';
  if (
    (choiceA === 'rock' && choiceB === 'scissors') ||
    (choiceA === 'paper' && choiceB === 'rock') ||
    (choiceA === 'scissors' && choiceB === 'paper')
  ) {
    return 'A';
  }
  return 'B';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playrockpaperscissors')
    .setDescription('🎮 ساحة حجرة - ورقة - مقص (RPS Arena) — العب بالرهان أو للمتعة.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('العضو الذي تريد تحديه.').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('مبلغ الرهان بـ Dinar TN (اختياري).').setMinValue(1).setRequired(false)
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: false });
    const { guildId, user: challenger } = interaction;
    const opponent = interaction.options.getUser('user');
    const bet = interaction.options.getInteger('bet') || 0;

    // ── Validations ──────────────────────────────────────────────────────────────
    if (opponent.id === challenger.id) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} خطأ`)
          .setDescription('لا يمكنك تحدي نفسك!')
          .setFooter({ text: 'Community Zone • RPS Arena' })]
      });
    }
    if (opponent.bot) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} خطأ`)
          .setDescription('لا يمكنك تحدي البوتات!')
          .setFooter({ text: 'Community Zone • RPS Arena' })]
      });
    }

    // Voice channel check — both must be in the SAME voice room if challenger is in one
    const member = interaction.member;
    const targetMember = interaction.options.getMember('user');
    if (member.voice.channelId) {
      if (!targetMember?.voice?.channelId || targetMember.voice.channelId !== member.voice.channelId) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} خطأ في الروم الصوتي`)
            .setDescription(`يجب أن تكون أنت و <@${opponent.id}> في نفس الروم الصوتي للعب معاً!`)
            .setFooter({ text: 'Community Zone • RPS Arena' })]
        });
      }
    }

    // ── Balance checks ───────────────────────────────────────────────────────────
    if (bet > 0) {
      const challengerBal = economy.getBalance(guildId, challenger.id);
      if (challengerBal < bet) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} رصيد غير كافٍ`)
            .setDescription(`رصيدك (\`${challengerBal.toLocaleString()} DT\`) أقل من الرهان (\`${bet.toLocaleString()} DT\`).`)
            .setFooter({ text: 'Community Zone • RPS Arena' })]
        });
      }
      const opponentBal = economy.getBalance(guildId, opponent.id);
      if (opponentBal < bet) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} رصيد الخصم غير كافٍ`)
            .setDescription(`رصيد <@${opponent.id}> (\`${opponentBal.toLocaleString()} DT\`) أقل من الرهان (\`${bet.toLocaleString()} DT\`).`)
            .setFooter({ text: 'Community Zone • RPS Arena' })]
        });
      }
    }

    // ── Challenge invite ─────────────────────────────────────────────────────────
    const inviteEmbed = new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle(`${getSafeEmoji('info', client, false)} تحدي حجرة - ورقة - مقص`)
      .setDescription(
        `🤝 <@${challenger.id}> يتحدى <@${opponent.id}> في **حجرة - ورقة - مقص**!\n\n` +
        `💰 **الرهان:** ${bet > 0 ? `\`${bet.toLocaleString()} DT\`` : 'للمتعة فقط 🎉'}\n\n` +
        `> <@${opponent.id}> — اضغط للقبول أو الرفض.`
      )
      .setFooter({ text: 'ينتهي القبول خلال 60 ثانية. • Dev by sejed.dev & akaza_senior' })
      .setTimestamp();

    const rowInvite = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps_accept').setLabel('قبول').setEmoji(getSafeEmoji('success', client, true)).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('rps_decline').setLabel('رفض').setEmoji(getSafeEmoji('error', client, true)).setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({ embeds: [inviteEmbed], components: [rowInvite] });

    const inviteCollector = msg.createMessageComponentCollector({
      filter: i => i.user.id === opponent.id,
      time: 60_000,
      max: 1
    });

    inviteCollector.on('end', async (collected, reason) => {
      if (reason === 'time' || !collected.size) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} انتهى وقت القبول`)
            .setDescription(`لم يستجب <@${opponent.id}> للتحدي في الوقت المحدد.`)],
          components: []
        });
      }

      const i = collected.first();

      if (i.customId === 'rps_decline') {
        return i.update({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} تم رفض التحدي`)
            .setDescription(`رفض <@${opponent.id}> تحدي <@${challenger.id}>.`)],
          components: []
        });
      }

      // ── Accepted — re-verify balances, then deduct ────────────────────────────
      if (bet > 0) {
        if (economy.getBalance(guildId, challenger.id) < bet || economy.getBalance(guildId, opponent.id) < bet) {
          return i.update({
            embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('error', client, false)} فشل بدء التحدي`)
              .setDescription('رصيد أحد اللاعبين غير كافٍ الآن. تم إلغاء التحدي.')],
            components: []
          });
        }
        economy.removeBalance(guildId, challenger.id, bet, `RPS Bet vs ${opponent.username}`);
        economy.removeBalance(guildId, opponent.id,   bet, `RPS Bet vs ${challenger.username}`);
      }

      // ── Game board ────────────────────────────────────────────────────────────
      let challengerChoice = null;
      let opponentChoice   = null;

      const buildGameEmbed = () => new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle(`${getSafeEmoji('casino', client, false)} ساحة حجرة - ورقة - مقص`)
        .setDescription(
          `⚔️ <@${challenger.id}> **ضد** <@${opponent.id}>\n` +
          `💰 **الرهان:** ${bet > 0 ? `\`${bet.toLocaleString()} DT\`` : 'للمتعة فقط'}\n\n` +
          `**حالة الاختيار:**\n` +
          `• <@${challenger.id}>: ${challengerChoice ? `${getSafeEmoji('success', client, false)} تم الاختيار` : `${getSafeEmoji('loading', client, false)} في الانتظار...`}\n` +
          `• <@${opponent.id}>: ${opponentChoice   ? `${getSafeEmoji('success', client, false)} تم الاختيار` : `${getSafeEmoji('loading', client, false)} في الانتظار...`}\n\n` +
          `> اختيارك **سري** — لن يراه الطرف الآخر حتى ينتهي الجميع.`
        )
        .setFooter({ text: 'لديك 60 ثانية للاختيار. • Dev by sejed.dev & akaza_senior' })
        .setTimestamp();

      const rowGame = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rps_rock').setLabel('حجرة').setEmoji('🪨').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_paper').setLabel('ورقة').setEmoji('📄').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rps_scissors').setLabel('مقص').setEmoji('✂️').setStyle(ButtonStyle.Primary)
      );

      await i.update({ embeds: [buildGameEmbed()], components: [rowGame] });

      const gameCollector = msg.createMessageComponentCollector({
        filter: click => [challenger.id, opponent.id].includes(click.user.id) &&
                         ['rps_rock','rps_paper','rps_scissors'].includes(click.customId),
        time: 60_000
      });

      gameCollector.on('collect', async click => {
        const choice = click.customId.replace('rps_', '');
        const isChallenger = click.user.id === challenger.id;

        if (isChallenger) {
          if (challengerChoice) return click.reply({ content: '❌ اخترت بالفعل!', ephemeral: true });
          challengerChoice = choice;
        } else {
          if (opponentChoice) return click.reply({ content: '❌ اخترت بالفعل!', ephemeral: true });
          opponentChoice = choice;
        }

        const labels = { rock: '🪨 حجرة', paper: '📄 ورقة', scissors: '✂️ مقص' };
        await click.reply({ content: `✅ اخترت **${labels[choice]}** — في انتظار الطرف الآخر.`, ephemeral: true });
        await interaction.editReply({ embeds: [buildGameEmbed()] });

        if (challengerChoice && opponentChoice) gameCollector.stop('completed');
      });

      // ── Resolve results ───────────────────────────────────────────────────────
      gameCollector.on('end', async (_, reason) => {
        const labels = { rock: '🪨 حجرة', paper: '📄 ورقة', scissors: '✂️ مقص' };

        if (reason !== 'completed') {
          const noneChose     = !challengerChoice && !opponentChoice;
          const chalWon = challengerChoice && !opponentChoice;

          if (noneChose) {
            if (bet > 0) {
              economy.addBalance(guildId, challenger.id, bet, 'RPS Timeout Refund');
              economy.addBalance(guildId, opponent.id,   bet, 'RPS Timeout Refund');
            }
            return interaction.editReply({
              embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle(`${getSafeEmoji('warning', client, false)} انتهى الوقت`)
                .setDescription('لم يختر أي من اللاعبين. تم إلغاء اللعبة وإرجاع الرهان.')],
              components: []
            });
          }

          const forfeitWinner = chalWon ? challenger : opponent;
          const forfeitLoser  = chalWon ? opponent   : challenger;
          if (bet > 0) economy.addBalance(guildId, forfeitWinner.id, bet * 2, 'RPS Win by Forfeit');

          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(0x10B981).setTitle(`${getSafeEmoji('success', client, false)} فوز بالانسحاب`)
              .setDescription(
                `🏆 <@${forfeitWinner.id}> فاز لأن <@${forfeitLoser.id}> لم يختر في الوقت!\n\n` +
                `${bet > 0 ? `💰 ربح **${(bet * 2).toLocaleString()} DT**` : ''}`
              )],
            components: []
          });
        }

        const result = getWinner(challengerChoice, opponentChoice);
        let color = 0xF59E0B;
        let desc  = '';

        if (result === 'Tie') {
          desc = `🤝 **تعادل!**\n\n` +
                 `• <@${challenger.id}>: **${labels[challengerChoice]}**\n` +
                 `• <@${opponent.id}>: **${labels[opponentChoice]}**\n\n` +
                 `> تم إرجاع الرهان لكلا اللاعبين.`;
          if (bet > 0) {
            economy.addBalance(guildId, challenger.id, bet, 'RPS Tie Refund');
            economy.addBalance(guildId, opponent.id,   bet, 'RPS Tie Refund');
          }
        } else {
          color = 0x10B981;
          const winner  = result === 'A' ? challenger : opponent;
          const loser   = result === 'A' ? opponent   : challenger;
          const wChoice = result === 'A' ? challengerChoice : opponentChoice;
          const lChoice = result === 'A' ? opponentChoice   : challengerChoice;
          if (bet > 0) economy.addBalance(guildId, winner.id, bet * 2, 'RPS Match Win');
          desc = `🏆 **الفائز: <@${winner.id}>!**\n\n` +
                 `• <@${winner.id}>: **${labels[wChoice]}** 👑\n` +
                 `• <@${loser.id}>: **${labels[lChoice]}**\n\n` +
                 `${bet > 0 ? `💰 ربح **${(bet * 2).toLocaleString()} DT** — رصيده: \`${economy.getBalance(guildId, winner.id).toLocaleString()} DT\`` : ''}`;
        }

        await interaction.editReply({
          embeds: [new EmbedBuilder().setColor(color).setTitle(`${getSafeEmoji('success', client, false)} نتيجة المباراة`).setDescription(desc).setTimestamp()],
          components: []
        });
      });
    });
  },
};
