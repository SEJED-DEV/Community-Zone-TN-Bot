const fs   = require('fs');
const path = require('path');

const dataDir      = path.join(__dirname, '../../data');
const economyPath  = path.join(dataDir, 'economy.json');
const settingsPath = path.join(dataDir, 'economy_settings.json');

// ─── Economy Item Definitions ────────────────────────────────────────────────
const SHOP_ITEMS = {
  // XP Boosts
  xp_boost_x2_24h: {
    id: 'xp_boost_x2_24h',
    name: '⚡ XP Boost ×2 (24h)',
    price: 3000,
    category: 'boost',
    description: 'Double all XP gains for 24 hours.',
    boost: { multiplier: 2, durationMs: 24 * 60 * 60 * 1000 },
  },

  // Custom rewards
  custom_role_name: {
    id: 'custom_role_name',
    name: '✨ Custom Role Name',
    price: 3500,
    category: 'custom',
    description: 'Request a custom role name from an admin.',
  },

  // Crates
  crate_common: {
    id: 'crate_common',
    name: '📦 Common Crate',
    price: 200,
    category: 'crate',
    description: 'Contains 500–1,000 XP.',
    rewards: [
      { xp: 500,  chance: 70 },
      { xp: 750,  chance: 25 },
      { xp: 1000, chance: 5  },
    ],
  },
  crate_rare: {
    id: 'crate_rare',
    name: '🎁 Rare Crate',
    price: 500,
    category: 'crate',
    description: 'Contains 1,500–3,000 XP.',
    rewards: [
      { xp: 1500, chance: 70 },
      { xp: 2250, chance: 25 },
      { xp: 3000, chance: 5  },
    ],
  },
  crate_epic: {
    id: 'crate_epic',
    name: '💎 Epic Crate',
    price: 1000,
    category: 'crate',
    description: 'Contains 4,000–8,000 XP.',
    rewards: [
      { xp: 4000, chance: 70 },
      { xp: 6000, chance: 25 },
      { xp: 8000, chance: 5  },
    ],
  },
  crate_legendary: {
    id: 'crate_legendary',
    name: '🔥 Legendary Crate',
    price: 2000,
    category: 'crate',
    description: 'Contains 10,000–20,000 XP.',
    rewards: [
      { xp: 10000, chance: 70 },
      { xp: 15000, chance: 25 },
      { xp: 20000, chance: 5  },
    ],
  },
  crate_mythic: {
    id: 'crate_mythic',
    name: '👑 Mythic Crate',
    price: 5000,
    category: 'crate',
    description: 'Contains 30,000–60,000 XP.',
    rewards: [
      { xp: 30000, chance: 70 },
      { xp: 45000, chance: 25 },
      { xp: 60000, chance: 5  },
    ],
  },

  // Exclusive roles
  role_diamond:  { id: 'role_diamond',  name: '💎 Diamond Role',  price: 15000, category: 'role', roleKey: 'diamond' },
  role_vip:      { id: 'role_vip',      name: '👑 VIP Role',      price: 60000, category: 'role', roleKey: 'vip',
    description: 'Access VIP channels & voice rooms. Can move members between voice channels.' },
};

// Casino XP Boost rewards only — nothing else can be won
// Chances: 20+25+25+10 = 80%. Remaining 20% = nothing (lose)
const CASINO_XP_BOOSTS = [
  { id: 'xp_x2_1h',   name: '⚡ XP ×2 (1h)',    multiplier: 2,   durationMs: 60 * 60 * 1000,      chance: 20 },
  { id: 'xp_x2_2h',   name: '⚡ XP ×2 (2h)',    multiplier: 2,   durationMs: 2 * 60 * 60 * 1000,  chance: 25 },
  { id: 'xp_x2_4h',   name: '⚡ XP ×2 (4h)',    multiplier: 2,   durationMs: 4 * 60 * 60 * 1000,  chance: 25 },
  { id: 'xp_x15_24h', name: '⚡ XP ×1.5 (24h)', multiplier: 1.5, durationMs: 24 * 60 * 60 * 1000, chance: 10 },
  // 20% implicit nothing — rollCasinoXpBoost() returns null when no entry is hit
];

// Cooldowns
const DAILY_COOLDOWN_MS  = 24 * 60 * 60 * 1000;
const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const CASINO_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DAILY_REWARD       = 200;
const WEEKLY_REWARD      = 1000;
const CASINO_ROLE_PRICE  = 350; // Restored to exactly 350 DT as requested

// ─── Manager ─────────────────────────────────────────────────────────────────
class EconomyManager {
  constructor() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this._data = {};    // { [guildId]: { [userId]: { balance, transactions[], cooldowns, boosts[] } } }
    this._settings = {}; // { [guildId]: { roles: {bronze,silver,...}, ... } }
    this._load();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────
  _load() {
    try {
      if (fs.existsSync(economyPath))  this._data     = JSON.parse(fs.readFileSync(economyPath,  'utf8'));
      if (fs.existsSync(settingsPath)) this._settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch { this._data = {}; this._settings = {}; }
  }

  _save() {
    try {
      fs.writeFileSync(economyPath,  JSON.stringify(this._data,     null, 2), 'utf8');
      fs.writeFileSync(settingsPath, JSON.stringify(this._settings, null, 2), 'utf8');
    } catch (e) { console.error('[ECONOMY] Save error:', e); }
  }

  // ── User Helpers ─────────────────────────────────────────────────────────────
  _getUser(guildId, userId) {
    if (!this._data[guildId]) this._data[guildId] = {};
    if (!this._data[guildId][userId]) {
      this._data[guildId][userId] = { balance: 0, transactions: [], cooldowns: {}, boosts: [] };
    }
    const u = this._data[guildId][userId];
    if (!u.transactions) u.transactions = [];
    if (!u.cooldowns)    u.cooldowns    = {};
    if (!u.boosts)       u.boosts       = [];
    if (u.lastNotifiedMilestone === undefined) u.lastNotifiedMilestone = 0;
    return u;
  }

  // ── Balance ──────────────────────────────────────────────────────────────────
  getBalance(guildId, userId) {
    return this._getUser(guildId, userId).balance;
  }

  addBalance(guildId, userId, amount, reason = 'Admin') {
    const u = this._getUser(guildId, userId);
    const oldBalance = u.balance;
    u.balance += amount;
    u.transactions.unshift({ type: 'credit', amount, reason, ts: Date.now() });
    if (u.transactions.length > 50) u.transactions.length = 50;
    this._save();

    // Check if the balance crossed a new 100 DT milestone
    const oldMilestone = Math.floor(oldBalance / 100);
    const newMilestone = Math.floor(u.balance / 100);
    const crossedMilestone = newMilestone > oldMilestone ? newMilestone * 100 : null;

    return { balance: u.balance, crossedMilestone };
  }

  removeBalance(guildId, userId, amount, reason = 'Admin') {
    const u = this._getUser(guildId, userId);
    u.balance = Math.max(0, u.balance - amount);
    u.transactions.unshift({ type: 'debit', amount, reason, ts: Date.now() });
    if (u.transactions.length > 50) u.transactions.length = 50;
    this._save();
    return u.balance;
  }

  setBalance(guildId, userId, amount) {
    const u = this._getUser(guildId, userId);
    u.balance = Math.max(0, amount);
    u.transactions.unshift({ type: 'set', amount, reason: 'Admin set', ts: Date.now() });
    if (u.transactions.length > 50) u.transactions.length = 50;
    this._save();
    return u.balance;
  }

  canAfford(guildId, userId, amount) {
    return this.getBalance(guildId, userId) >= amount;
  }

  /** Transfer between two users. Returns false if payer can't afford. Also returns crossedMilestone for the receiver. */
  transfer(guildId, fromId, toId, amount) {
    if (!this.canAfford(guildId, fromId, amount)) return false;
    this.removeBalance(guildId, fromId, amount, `Sent to <@${toId}>`);
    const result = this.addBalance(guildId, toId, amount, `Received from <@${fromId}>`);
    return { success: true, balance: result.balance, crossedMilestone: result.crossedMilestone };
  }

  // ── Transactions ─────────────────────────────────────────────────────────────
  getTransactions(guildId, userId, limit = 10) {
    return (this._getUser(guildId, userId).transactions || []).slice(0, limit);
  }

  // ── Cooldowns ─────────────────────────────────────────────────────────────────
  getCooldown(guildId, userId, key) {
    return this._getUser(guildId, userId).cooldowns[key] || 0;
  }

  setCooldown(guildId, userId, key) {
    this._getUser(guildId, userId).cooldowns[key] = Date.now();
    this._save();
  }

  getRemainingCooldown(guildId, userId, key, durationMs) {
    const last = this.getCooldown(guildId, userId, key);
    const remaining = durationMs - (Date.now() - last);
    return remaining > 0 ? remaining : 0;
  }

  // ── Daily / Weekly ───────────────────────────────────────────────────────────
  claimDaily(guildId, userId) {
    const remaining = this.getRemainingCooldown(guildId, userId, 'daily', DAILY_COOLDOWN_MS);
    if (remaining > 0) return { success: false, remaining };
    this.setCooldown(guildId, userId, 'daily');
    const result = this.addBalance(guildId, userId, DAILY_REWARD, 'Daily Reward');
    return { success: true, amount: DAILY_REWARD, balance: result.balance, crossedMilestone: result.crossedMilestone };
  }

  claimWeekly(guildId, userId) {
    const remaining = this.getRemainingCooldown(guildId, userId, 'weekly', WEEKLY_COOLDOWN_MS);
    if (remaining > 0) return { success: false, remaining };
    this.setCooldown(guildId, userId, 'weekly');
    const result = this.addBalance(guildId, userId, WEEKLY_REWARD, 'Weekly Reward');
    return { success: true, amount: WEEKLY_REWARD, balance: result.balance, crossedMilestone: result.crossedMilestone };
  }

  // ── XP Boosts ────────────────────────────────────────────────────────────────
  getActiveBoost(guildId, userId) {
    const u = this._getUser(guildId, userId);
    const now = Date.now();
    // Clean expired boosts
    u.boosts = u.boosts.filter(b => b.expiresAt > now);
    if (u.boosts.length === 0) return null;
    // Return highest multiplier
    return u.boosts.reduce((best, b) => b.multiplier > best.multiplier ? b : best, u.boosts[0]);
  }

  addBoost(guildId, userId, multiplier, durationMs, name) {
    const u = this._getUser(guildId, userId);
    const now = Date.now();
    u.boosts = u.boosts.filter(b => b.expiresAt > now);
    const expiresAt = now + durationMs;
    u.boosts.push({ multiplier, expiresAt, name });
    this._save();
    return expiresAt; // Return the exact timestamp stored for stable display
  }

  getXpMultiplier(guildId, userId) {
    const boost = this.getActiveBoost(guildId, userId);
    return boost ? boost.multiplier : 1;
  }

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  getLeaderboard(guildId, limit = 10) {
    const g = this._data[guildId] || {};
    return Object.entries(g)
      .map(([userId, d]) => ({ userId, balance: d.balance || 0 }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  // ── Loot Box ─────────────────────────────────────────────────────────────────
  rollCrate(crateId) {
    const item = SHOP_ITEMS[crateId];
    if (!item || !item.rewards) return null;
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const reward of item.rewards) {
      cumulative += reward.chance;
      if (roll < cumulative) return reward;
    }
    return item.rewards[item.rewards.length - 1];
  }

  // ── Casino ───────────────────────────────────────────────────────────────────
  // Returns an XP boost object, or null if the user wins nothing (20% chance)
  rollCasinoXpBoost() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const b of CASINO_XP_BOOSTS) {
      cumulative += b.chance;
      if (roll < cumulative) return b;
    }
    return null; // 20% nothing — user loses their bet
  }

  casinoCooldownRemaining(guildId, userId) {
    return this.getRemainingCooldown(guildId, userId, 'casino', CASINO_COOLDOWN_MS);
  }

  setCasinoCooldown(guildId, userId) {
    this.setCooldown(guildId, userId, 'casino');
  }

  // ── Guild Settings ────────────────────────────────────────────────────────────
  getSettings(guildId) {
    if (!this._settings[guildId]) this._settings[guildId] = { roles: {} };
    return this._settings[guildId];
  }

  setRoleId(guildId, roleKey, roleId) {
    const s = this.getSettings(guildId);
    if (!s.roles) s.roles = {};
    s.roles[roleKey] = roleId;
    this._save();
  }

  getRoleId(guildId, roleKey) {
    return this.getSettings(guildId)?.roles?.[roleKey] || null;
  }
}

const manager = new EconomyManager();

module.exports = manager;
module.exports.SHOP_ITEMS        = SHOP_ITEMS;
module.exports.CASINO_XP_BOOSTS  = CASINO_XP_BOOSTS;
module.exports.DAILY_REWARD      = DAILY_REWARD;
module.exports.WEEKLY_REWARD     = WEEKLY_REWARD;
module.exports.CASINO_ROLE_PRICE = CASINO_ROLE_PRICE;
