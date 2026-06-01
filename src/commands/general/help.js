const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const embedGenerator = require('../../utils/embedGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help instructions for all bot systems (voice, logs & leveling).'),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    // ── Page 1: Voice & Logs ───────────────────────────────
    const voiceEmbed = embedGenerator.info(
      `Welcome to **Community Zone Bot** (Dev by **Akaza_senior**)! This premium utility handles voice automation, audit logging, and a full XP leveling system.\n\n` +
      `**🔊 How Temporary Rooms Work:**\n` +
      `1. Join the designated **➕ Create Voice** channel.\n` +
      `2. The bot immediately creates a private voice channel and moves you in.\n` +
      `3. A linked private text channel is spawned, visible **only** to room members.\n` +
      `4. A **Control Dashboard** is sent in the text channel with easy room managers.\n` +
      `5. Once everyone leaves, both channels are instantly cleaned up.\n\n` +
      `**👑 Dashboard Button Commands (Owner Only):**\n` +
      `• **📝 Rename** — Modify your voice room title.\n` +
      `• **👥 Limit** — Set user capacity (max 99).\n` +
      `• **🔇 Mute/Unmute** — Server mute/unmute room members.\n` +
      `• **🦶 Kick** — Eject a selected user from the room.\n` +
      `• **🔒 Lock / 🔓 Unlock** — Restrict or restore general joining.\n` +
      `• **🙈 Hide / 👀 Show** — Hide/show the room in channel lists.\n` +
      `• **✅ Whitelist / ❌ Revoke** — Grant/revoke special entry access.\n` +
      `• **👑 Transfer** — Hand over room ownership to a peer.\n\n` +
      `**🛡️ Admin Commands:**\n` +
      `• \`/setup\` — View & configure the bot's channel settings.\n` +
      `• \`/block user <user>\` — Ban a user from temp voice globally.\n` +
      `• \`/block role <role>\` — Ban a role from temp voice globally.\n` +
      `• \`/unblock user/role\` — Lift a restriction.`,
      '📚 Help Guide — Voice & Logging'
    );

    // ── Page 2: Leveling System ────────────────────────────
    const levelEmbed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('⭐ Help Guide — XP Leveling System')
      .setDescription(
        `The leveling system rewards active members with XP for chatting.\n` +
        `Reach milestone levels to automatically earn and upgrade your **level role**!\n\n` +
        `**📈 How It Works:**\n` +
        `• Every message you send earns **15–25 XP** (15 second cooldown).\n` +
        `• The bot tracks your XP and level per server.\n` +
        `• At **every 5th level** (Level 5, 10, 15 … up to 250) you receive a special role.\n` +
        `• Your **old role is automatically removed** and replaced — you only ever have one.\n\n` +
        `**🏅 Member Commands:**\n` +
        `• \`/rank\` — View your XP, level, progress bar & current milestone role.\n` +
        `• \`/rank [user]\` — Check another member's rank card.\n` +
        `• \`/leaderboard\` — View the server XP leaderboard (10 per page).\n` +
        `• \`/leaderboard [page]\` — Jump to a specific leaderboard page.\n` +
        `• \`/levels\` — Browse all 50 milestone roles and their XP requirements.\n\n` +
        `**⚙️ Admin Commands:**\n` +
        `• \`/levelsetup channel #channel\` — Set where level-up announcements are sent.\n` +
        `• \`/levelsetup enable true/false\` — Enable or disable XP earning.\n` +
        `• \`/levelsetup status\` — View current leveling configuration.\n` +
        `• \`/levelsetup createroles\` — List all 50 milestone roles & check which are missing.\n` +
        `• \`/xpadmin setxp [user] [amount]\` — Manually set a user's total XP.\n` +
        `• \`/xpadmin addxp [user] [amount]\` — Add XP to a user (bypasses cooldown).\n` +
        `• \`/xpadmin reset [user]\` — Wipe a user's XP, level, and level roles.\n` +
        `• \`/xpadmin syncroles [user]\` — Force-sync level roles from current XP data.\n\n` +
        `**🎖️ Milestone Roles (Level → Role):**\n` +
        `Lvl 5 🚀 · Lvl 10 ✨ · Lvl 15 🔥 · Lvl 20 💎 · Lvl 25 🏆 · Lvl 30 ⚡\n` +
        `Lvl 35 🎯 · Lvl 40 👑 *(cycle repeats every 8 milestones up to Lvl 245)*\n` +
        `**Lvl 250 🌟** — The ultimate legendary tier!`
      )
      .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
      .setTimestamp();

    await interaction.editReply({ embeds: [voiceEmbed] });
    // Send leveling embed as a follow-up so both pages are visible
    await interaction.followUp({ embeds: [levelEmbed], ephemeral: true });

    // ── Page 3: Music System ───────────────────────────────
    const musicEmbed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('🎵 Help Guide — Music System')
      .setDescription(
        `The music bot lets any member play audio from **YouTube** directly in any voice channel.\n\n` +
        `**🎶 How It Works:**\n` +
        `• Join a voice channel, then run \`/play\` with a URL or song name.\n` +
        `• The bot joins your channel, streams the audio, and posts a **Now Playing** card with control buttons.\n` +
        `• It auto-disconnects after **3 minutes** of inactivity when the queue is empty.\n\n` +
        `**🎵 Music Commands:**\n` +
        `• \`/play [query or URL]\` — Play a YouTube video/playlist, or search by song name.\n` +
        `• \`/skip\` — Skip the current song.\n` +
        `• \`/stop\` — Stop playback, clear the queue & disconnect.\n` +
        `• \`/pause\` — Pause the current song.\n` +
        `• \`/resume\` — Resume a paused song.\n` +
        `• \`/queue [page]\` — View the full queue (10 songs per page).\n` +
        `• \`/nowplaying\` — Show details about the currently playing song.\n\n` +
        `**🎮 Now Playing Buttons:**\n` +
        `• **⏸ Pause/Resume** — Toggle playback pause.\n` +
        `• **⏭ Skip** — Skip to the next song in the queue.\n` +
        `• **⏹ Stop** — Stop everything and disconnect.\n` +
        `• **📋 Queue** — Peek at upcoming songs.\n\n` +
        `**🔗 Supported Sources:**\n` +
        `• ✅ **YouTube Videos** — Paste any YouTube video link.\n` +
        `• ✅ **YouTube Playlists** — Paste a full playlist URL to queue everything.\n` +
        `• ✅ **YouTube Search** — Just type the song name and we'll find it!`
      )
      .setFooter({ text: 'Community Zone • Dev by Akaza_senior' })
      .setTimestamp();

    await interaction.followUp({ embeds: [musicEmbed], ephemeral: true });
  }
};
