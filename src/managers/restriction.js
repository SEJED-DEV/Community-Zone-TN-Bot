/**
 * Memory-based manager for global user and role restrictions.
 * Blocks are kept in runtime memory Sets, ensuring extremely fast lookups.
 */
class RestrictionManager {
  constructor() {
    this.blockedUsers = new Set();
    this.blockedRoles = new Set();
  }

  /**
   * Globally block a user.
   */
  blockUser(userId) {
    this.blockedUsers.add(userId);
    return true;
  }

  /**
   * Globally unblock a user.
   */
  unblockUser(userId) {
    return this.blockedUsers.delete(userId);
  }

  /**
   * Globally block a role.
   */
  blockRole(roleId) {
    this.blockedRoles.add(roleId);
    return true;
  }

  /**
   * Globally unblock a role.
   */
  unblockRole(roleId) {
    return this.blockedRoles.delete(roleId);
  }

  /**
   * Check if a user is blocked by user ID.
   */
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  /**
   * Check if a role is blocked by role ID.
   */
  isRoleBlocked(roleId) {
    return this.blockedRoles.has(roleId);
  }

  /**
   * Check if a GuildMember is globally blocked (either by user ID or any of their roles).
   * @param {GuildMember} member - The guild member to check
   */
  isMemberBlocked(member) {
    if (!member) return false;

    // Check user ID
    if (this.blockedUsers.has(member.id)) return true;

    // Check user roles
    if (member.roles && member.roles.cache) {
      for (const roleId of member.roles.cache.keys()) {
        if (this.blockedRoles.has(roleId)) return true;
      }
    }

    return false;
  }

  /**
   * Get list of all blocked user IDs.
   */
  getBlockedUsers() {
    return Array.from(this.blockedUsers);
  }

  /**
   * Get list of all blocked role IDs.
   */
  getBlockedRoles() {
    return Array.from(this.blockedRoles);
  }
}

// Export a single instance to be shared across events and commands
module.exports = new RestrictionManager();
