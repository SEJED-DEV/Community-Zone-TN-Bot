const fs = require('fs');
const path = require('path');
const config = require('../config');

const dataDir = path.join(__dirname, '../../data');
const settingsPath = path.join(dataDir, 'settings.json');

/**
 * Handles persistence of bot configurations without a database,
 * utilizing a secure local JSON storage with on-the-fly memory updates.
 */
class SettingsManager {
  /**
   * Initialize and ensure data directory exists.
   */
  constructor() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Load settings from settings.json.
   */
  loadSettings() {
    if (fs.existsSync(settingsPath)) {
      try {
        const raw = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('[SETTINGS MANAGER ERROR] Failed to parse settings.json:', e);
      }
    }
    return {};
  }

  /**
   * Save and apply settings to settings.json and active config memory.
   */
  saveSettings(newSettings) {
    try {
      const current = this.loadSettings();
      const updated = { ...current, ...newSettings };
      
      fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), 'utf8');

      // Instantly hot-reload configurations in active bot memory
      if (updated.triggerChannelId) config.triggerChannelId = updated.triggerChannelId;
      if (updated.tempCategoryId) config.tempCategoryId = updated.tempCategoryId;
      if (updated.logChannelId) config.logChannelId = updated.logChannelId;
      if (updated.leaveChannelId) config.leaveChannelId = updated.leaveChannelId;
      if (updated.banAnnouncementChannelId) config.banAnnouncementChannelId = updated.banAnnouncementChannelId;
      if (updated.kickChannelId !== undefined) config.kickChannelId = updated.kickChannelId;
      if (updated.timeoutChannelId !== undefined) config.timeoutChannelId = updated.timeoutChannelId;
      if (updated.warnChannelId !== undefined) config.warnChannelId = updated.warnChannelId;
      if (updated.levelUpChannelId !== undefined) config.levelUpChannelId = updated.levelUpChannelId;
      if (updated.levelingEnabled !== undefined) config.levelingEnabled = updated.levelingEnabled;
      if (updated.nicknamePanelChannelId !== undefined) config.nicknamePanelChannelId = updated.nicknamePanelChannelId;
      if (updated.gameRolePanelChannelId !== undefined) config.gameRolePanelChannelId = updated.gameRolePanelChannelId;
      if (updated.serverTag !== undefined) config.serverTag = updated.serverTag;
      if (updated.mrWhiteStatsChannelId !== undefined) config.mrWhiteStatsChannelId = updated.mrWhiteStatsChannelId;
      if (updated.trackerLogChannelId !== undefined) config.trackerLogChannelId = updated.trackerLogChannelId;
      if (updated.confessChannelId !== undefined) config.confessChannelId = updated.confessChannelId;

      console.log('[SETTINGS MANAGER] Settings saved and hot-reloaded successfully.');
      return true;
    } catch (error) {
      console.error('[SETTINGS MANAGER ERROR] Failed to save settings:', error);
      return false;
    }
  }
}

module.exports = new SettingsManager();
