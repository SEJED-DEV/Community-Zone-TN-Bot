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
