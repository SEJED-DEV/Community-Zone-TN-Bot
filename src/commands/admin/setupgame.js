const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupgame')
    .setDescription('Deploy the Rock-Paper-Scissors (RPS) Game Arena panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B) // Amber
      .setTitle('🎮 Rock-Paper-Scissors Arena | ساحة حجرة - ورقة - مقص')
      .setDescription(
        '⚔️ **Welcome to the RPS Arena!**\n' +
        'Challenge another member in a best-of-3 rounds match and bet your XP!\n\n' +
        '🏆 **أهلاً بكم في ساحة التحدي!**\n' +
        'تحدّ عضواً آخر في مباراة من 3 جولات وراهن بنقاط الخبرة الخاصة بك!\n\n' +
        '• **Min Bet:** `100 XP`\n' +
        '• **Max Bet:** Your current XP\n' +
        '• **Rule:** Winner takes the bet XP, loser loses it!'
      )
      .setFooter({ text: 'Community Zone • Game Arena' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rps_create_game')
        .setLabel('⚔️ Create Challenge | إنشاء تحدي')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });

    return interaction.editReply({ content: '✅ Game Arena Panel successfully deployed to this channel!' });
  }
};
