╔══════════════════════════════════════════════════════════════════╗
║           COMMUNITY ZONE TN — BOT UPDATE GUIDE                  ║
╚══════════════════════════════════════════════════════════════════╝

📁 HOW THE FOLDERS ARE ORGANIZED
─────────────────────────────────────────────────────────────────
YOUR SERVER STRUCTURE (katabump folder mirrors this):

  katabump/
  ├── src/           ← 🟢 CODE ONLY — safe to overwrite every update
  ├── data/          ← 🔴 YOUR DATABASE — NEVER overwrite (levels, settings)
  ├── .env           ← 🔴 YOUR SECRET CONFIG — NEVER overwrite (bot token)
  ├── package.json   ← 🟡 Only overwrite if told to (new dependencies)
  ├── index.js       ← 🟢 safe to overwrite
  ├── dashboard.png  ← 🟡 Only if you want a new design
  └── level.png      ← 🟡 Only if you want a new design

─────────────────────────────────────────────────────────────────
✅ TO UPDATE THE BOT (when Akaza gives you a new version):
─────────────────────────────────────────────────────────────────

  STEP 1 → Upload ONLY the "src" folder to your server
           (Replace the old src folder entirely)

  STEP 2 → Restart the bot

  ✅ DONE! Your levels, settings and tag are all preserved.

─────────────────────────────────────────────────────────────────
🔴 NEVER UPLOAD THESE (or you will LOSE data):
─────────────────────────────────────────────────────────────────

  ❌ data/             ← Contains user levels + bot settings
  ❌ .env              ← Contains your bot token

─────────────────────────────────────────────────────────────────
📦 WHAT IS STORED IN data/
─────────────────────────────────────────────────────────────────

  data/
  ├── leveling.json       ← All user XP and levels
  ├── settings.json       ← Bot settings (channels, tag, etc.)
  └── temp_nicknames.json ← Temp voice nickname backups (auto-created)

─────────────────────────────────────────────────────────────────
🆘 FIRST TIME INSTALL (fresh server, no data yet):
─────────────────────────────────────────────────────────────────

  STEP 1 → Upload everything EXCEPT .env
  STEP 2 → Upload your .env file separately
  STEP 3 → Run: npm install
  STEP 4 → Start the bot
  STEP 5 → Run /setup to configure channels
  STEP 6 → Run /setuptag to set your server tag
  STEP 7 → Run /applyprefixall to tag all members

═══════════════════════════════════════════════════════════════════
