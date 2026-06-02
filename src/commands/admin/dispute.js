const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const disputeManager = require('../../managers/disputeManager');
const embedGenerator = require('../../utils/embedGenerator');
const { getSafeEmoji } = require('../../utils/emojiHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dispute')
    .setDescription('⚖️ Manage disputes between users to prevent them from joining the same temp voice rooms.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('add')
         .setDescription('Add a dispute between two users.')
         .addUserOption(opt => opt.setName('user1').setDescription('First user').setRequired(true))
         .addUserOption(opt => opt.setName('user2').setDescription('Second user').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
         .setDescription('Remove a dispute between two users.')
         .addUserOption(opt => opt.setName('user1').setDescription('First user').setRequired(true))
         .addUserOption(opt => opt.setName('user2').setDescription('Second user').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
         .setDescription('List disputes for a user.')
         .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(true))
    ),

  async execute(client, interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const u1 = interaction.options.getUser('user1');
      const u2 = interaction.options.getUser('user2');

      if (u1.id === u2.id) return interaction.reply({ embeds: [embedGenerator.error('You cannot add a dispute with the same user twice.')], ephemeral: true });

      disputeManager.addDispute(u1.id, u2.id);
      return interaction.reply({ embeds: [embedGenerator.success(`${getSafeEmoji('dispute', client, false)} Dispute added between **${u1.tag}** and **${u2.tag}**.`)] });
    }

    if (sub === 'remove') {
      const u1 = interaction.options.getUser('user1');
      const u2 = interaction.options.getUser('user2');

      disputeManager.removeDispute(u1.id, u2.id);
      return interaction.reply({ embeds: [embedGenerator.success(`${getSafeEmoji('dispute', client, false)} Dispute removed between **${u1.tag}** and **${u2.tag}**.`)] });
    }

    if (sub === 'list') {
      const user = interaction.options.getUser('user');
      const disputes = disputeManager.getDisputes(user.id);

      if (disputes.size === 0) {
        return interaction.reply({ embeds: [embedGenerator.info(`**${user.tag}** has no active disputes.`)] });
      }

      const list = Array.from(disputes).map(id => `<@${id}> (\`${id}\`)`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`${getSafeEmoji('dispute', client, false)} Disputes for ${user.username}`)
        .setColor(0xF59E0B)
        .setDescription(list)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },
};
