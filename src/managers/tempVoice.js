const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const roomsPath = path.join(dataDir, 'temp_rooms.json');

/**
 * Memory-based manager for temporary voice channels.
 * No databases are used; all state is tracked in runtime memory maps.
 */
class TempVoiceManager {
  constructor() {
    // Map: voiceChannelId -> RoomDetails
    this.rooms = new Map();
    // Map: textChannelId -> voiceChannelId (for quick lookup of room by text channel)
    this.textToVoice = new Map();
    // Map: userId -> voiceChannelId (active creation lock to prevent double creation spam)
    this.creationLocks = new Set();
    // Map: voiceChannelId -> NodeJS.Timeout (grace period tracking before deletion)
    this.deletionTimeouts = new Map();

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.loadRooms();
  }

  /**
   * Load rooms from persistent storage.
   */
  loadRooms() {
    if (fs.existsSync(roomsPath)) {
      try {
        const raw = fs.readFileSync(roomsPath, 'utf8');
        const data = JSON.parse(raw);
        for (const [voiceId, room] of Object.entries(data)) {
          room.whitelistedUsers = new Set(room.whitelistedUsers || []);
          room.whitelistedRoles = new Set(room.whitelistedRoles || []);
          room.createdAt = new Date(room.createdAt);
          this.rooms.set(voiceId, room);
          if (room.textId) {
            this.textToVoice.set(room.textId, voiceId);
          }
        }
        console.log(`[TEMP VOICE] Loaded ${this.rooms.size} rooms from storage.`);
      } catch (e) {
        console.error('[TEMP VOICE ERROR] Failed to load temp_rooms.json:', e);
      }
    }
  }

  /**
   * Save rooms to persistent storage.
   */
  saveRooms() {
    try {
      const data = {};
      for (const [voiceId, room] of this.rooms.entries()) {
        data[voiceId] = {
          ...room,
          whitelistedUsers: Array.from(room.whitelistedUsers),
          whitelistedRoles: Array.from(room.whitelistedRoles)
        };
      }
      fs.writeFileSync(roomsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[TEMP VOICE ERROR] Failed to save temp_rooms.json:', e);
    }
  }

  /**
   * Register a new temporary room.
   */
  createRoom(voiceId, textId, ownerId) {
    const room = {
      voiceId,
      textId,
      ownerId,
      originalOwnerId: ownerId,
      locked: false,
      hidden: false,
      whitelistedUsers: new Set(),
      whitelistedRoles: new Set(),
      createdAt: new Date(),
    };
    this.rooms.set(voiceId, room);
    this.textToVoice.set(textId, voiceId);
    this.saveRooms();
    return room;
  }

  /**
   * Retrieve a room by its voice channel ID.
   */
  getRoomByVoiceId(voiceId) {
    return this.rooms.get(voiceId);
  }

  /**
   * Retrieve a room by its text channel ID.
   */
  getRoomByTextId(textId) {
    const voiceId = this.textToVoice.get(textId);
    if (!voiceId) return null;
    return this.rooms.get(voiceId);
  }

  /**
   * Find a room owned by a specific user.
   */
  getRoomByOwnerId(ownerId) {
    for (const room of this.rooms.values()) {
      if (room.ownerId === ownerId) {
        return room;
      }
    }
    return null;
  }

  /**
   * Delete a room from memory caches.
   */
  deleteRoom(voiceId) {
    const room = this.rooms.get(voiceId);
    if (room) {
      this.textToVoice.delete(room.textId);
      this.rooms.delete(voiceId);
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Update the owner of a temporary voice channel.
   */
  setOwner(voiceId, newOwnerId) {
    const room = this.rooms.get(voiceId);
    if (room) {
      room.ownerId = newOwnerId;
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Set room locking status.
   */
  setLocked(voiceId, locked) {
    const room = this.rooms.get(voiceId);
    if (room) {
      room.locked = locked;
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Set room visibility status.
   */
  setHidden(voiceId, hidden) {
    const room = this.rooms.get(voiceId);
    if (room) {
      room.hidden = hidden;
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Whitelist a specific user for the room.
   */
  allowUser(voiceId, userId) {
    const room = this.rooms.get(voiceId);
    if (room) {
      room.whitelistedUsers.add(userId);
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Remove a user from the room's whitelist.
   */
  denyUser(voiceId, userId) {
    const room = this.rooms.get(voiceId);
    if (room) {
      room.whitelistedUsers.delete(userId);
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Whitelist a specific role for the room.
   */
  allowRole(voiceId, roleId) {
    const room = this.rooms.get(voiceId);
    if (room) {
      room.whitelistedRoles.add(roleId);
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Remove a role from the room's whitelist.
   */
  denyRole(voiceId, roleId) {
    const room = this.rooms.get(voiceId);
    if (room) {
      room.whitelistedRoles.delete(roleId);
      this.saveRooms();
      return true;
    }
    return false;
  }

  /**
   * Check if a user is explicitly whitelisted for a room.
   */
  isUserWhitelisted(voiceId, userId) {
    const room = this.rooms.get(voiceId);
    if (!room) return false;
    return room.whitelistedUsers.has(userId) || room.ownerId === userId;
  }

  /**
   * Acquire a creation lock for a user to prevent simultaneous channel creations.
   */
  acquireLock(userId) {
    if (this.creationLocks.has(userId)) return false;
    this.creationLocks.add(userId);
    // Auto release lock after 5 seconds in case of unhandled failure
    setTimeout(() => this.releaseLock(userId), 5000);
    return true;
  }

  /**
   * Release the creation lock.
   */
  releaseLock(userId) {
    this.creationLocks.delete(userId);
  }

  /**
   * Get all registered rooms.
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Schedule a deletion timeout.
   */
  scheduleDeletion(voiceId, timeoutObj) {
    this.deletionTimeouts.set(voiceId, timeoutObj);
  }

  /**
   * Cancel an active scheduled deletion timeout.
   */
  cancelDeletion(voiceId) {
    const timeout = this.deletionTimeouts.get(voiceId);
    if (timeout) {
      clearTimeout(timeout);
      this.deletionTimeouts.delete(voiceId);
      return true;
    }
    return false;
  }

  /**
   * Remove a deletion record from memory without clearing.
   */
  clearDeletion(voiceId) {
    this.deletionTimeouts.delete(voiceId);
  }
}

// Export a single instance to be shared across events and commands
module.exports = new TempVoiceManager();
