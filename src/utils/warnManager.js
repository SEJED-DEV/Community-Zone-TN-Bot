const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const warningsPath = path.join(dataDir, 'warnings.json');

class WarnManager {
  constructor() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Load warnings database from warnings.json
   */
  loadWarnings() {
    if (fs.existsSync(warningsPath)) {
      try {
        const raw = fs.readFileSync(warningsPath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('[WARN MANAGER ERROR] Failed to parse warnings.json:', e);
      }
    }
    return {};
  }

  /**
   * Save warnings database to warnings.json
   */
  saveWarnings(data) {
    try {
      fs.writeFileSync(warningsPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('[WARN MANAGER ERROR] Failed to save warnings.json:', e);
      return false;
    }
  }

  /**
   * Get user moderation profile
   */
  getUserWarnings(guildId, userId) {
    const data = this.loadWarnings();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) {
      data[guildId][userId] = {
        warnCount: 0,
        history: [],
        moderationHistory: []
      };
    }
    // Migration: ensure moderationHistory exists
    if (!data[guildId][userId].moderationHistory) {
      data[guildId][userId].moderationHistory = [];
    }
    return data[guildId][userId];
  }

  /**
   * Add warning entry to user profile
   */
  addWarning(guildId, userId, warnLevel, reason, moderatorId) {
    const data = this.loadWarnings();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) {
      data[guildId][userId] = {
        warnCount: 0,
        history: [],
        moderationHistory: []
      };
    }

    const userWarns = data[guildId][userId];
    userWarns.warnCount = warnLevel;
    userWarns.history.push({
      type: 'WARNING',
      warnLevel,
      reason,
      moderatorId,
      timestamp: Math.floor(Date.now() / 1000)
    });

    this.saveWarnings(data);
    return userWarns;
  }

  /**
   * Add a moderation action (Ban, Kick, Timeout) to user history
   */
  addModerationAction(guildId, userId, type, reason, moderatorId, duration = null) {
    const data = this.loadWarnings();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) {
      data[guildId][userId] = {
        warnCount: 0,
        history: [],
        moderationHistory: []
      };
    }

    if (!data[guildId][userId].moderationHistory) {
      data[guildId][userId].moderationHistory = [];
    }

    data[guildId][userId].moderationHistory.push({
      type,
      reason,
      moderatorId,
      duration,
      timestamp: Math.floor(Date.now() / 1000)
    });

    this.saveWarnings(data);
    return data[guildId][userId];
  }

  /**
   * Reset warning profile for a user
   */
  resetWarnings(guildId, userId) {
    const data = this.loadWarnings();
    if (!data[guildId]) data[guildId] = {};
    const existing = data[guildId][userId] || {};
    data[guildId][userId] = {
      warnCount: 0,
      history: [],
      moderationHistory: existing.moderationHistory || []
    };
    this.saveWarnings(data);
    return data[guildId][userId];
  }
}

module.exports = new WarnManager();
