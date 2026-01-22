import type { SlskdUserStatus, SlskdUserAttributes } from '@server/models/SlskdUser';
import type { SlskdSearchResponse } from '@server/types/slskd-client';

import { Op } from '@sequelize/core';
import SlskdUser from '@server/models/SlskdUser';
import { getConfig } from '@server/config/settings';
import logger from '@server/config/logger';

export interface UserFilters {
  status?: SlskdUserStatus;
  search?: string;
  limit?:  number;
  offset?: number;
}

export interface UserStats {
  total:   number;
  neutral: number;
  trusted: number;
  flagged: number;
  blocked: number;
}

export interface UserExport {
  trusted: string[];
  blocked: string[];
  flagged: string[];
}

export interface UserImport {
  trusted?: string[];
  blocked?: string[];
  flagged?: string[];
}

export interface RecordSuccessOptions {
  bytes:        number;
  speed:        number;
  qualityScore: number;
}

/**
 * Service for managing slskd user reputation.
 * Tracks download outcomes to prioritize trusted users and block unreliable ones.
 */
export class UserReputationService {
  /**
   * Check if user reputation feature is enabled
   */
  isEnabled(): boolean {
    const config = getConfig();

    return config.slskd?.user_reputation?.enabled ?? false;
  }

  /**
   * Get user reputation settings
   */
  private getSettings() {
    const config = getConfig();

    return {
      autoTrustThreshold: config.slskd?.user_reputation?.auto_trust_threshold ?? 5,
      autoFlagThreshold:  config.slskd?.user_reputation?.auto_flag_threshold ?? 3,
      trackQuality:       config.slskd?.user_reputation?.track_quality ?? true,
    };
  }

  /**
   * Find or create a user record by username
   */
  async findOrCreateUser(username: string): Promise<SlskdUser> {
    const normalizedUsername = username.toLowerCase();

    const [user] = await SlskdUser.findOrCreate({
      where:    { username: normalizedUsername },
      defaults: { username: normalizedUsername },
    });

    return user;
  }

  /**
   * Get a user by ID
   */
  async getUser(id: string): Promise<SlskdUser | null> {
    return SlskdUser.findByPk(id);
  }

  /**
   * Get a user by username
   */
  async getUserByUsername(username: string): Promise<SlskdUser | null> {
    return SlskdUser.findOne({ where: { username: username.toLowerCase() } });
  }

  /**
   * Record a successful download from a user
   */
  async recordSuccess(username: string, options: RecordSuccessOptions): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const { bytes, speed, qualityScore } = options;
    const settings = this.getSettings();
    const user = await this.findOrCreateUser(username);

    // Calculate new averages
    const newSuccessCount = user.successCount + 1;
    const newTotalBytes = Number(user.totalBytes) + bytes;

    // Weighted average for speed (favor recent transfers)
    const newAverageSpeed = user.successCount > 0? Math.round((user.averageSpeed * user.successCount + speed) / newSuccessCount): speed;

    // Weighted average for quality score
    const newQualityScore = settings.trackQuality && user.successCount > 0? Math.round((user.qualityScore * user.successCount + qualityScore) / newSuccessCount): settings.trackQuality ? qualityScore : user.qualityScore;

    // Determine if user should be auto-trusted
    let newStatus = user.status;

    if (user.status === 'neutral' && newSuccessCount >= settings.autoTrustThreshold) {
      newStatus = 'trusted';
      logger.info('[reputation] auto-trusting user', { username, successCount: newSuccessCount });
    }

    await SlskdUser.update(
      {
        successCount: newSuccessCount,
        totalBytes:   newTotalBytes,
        averageSpeed: newAverageSpeed,
        qualityScore: newQualityScore,
        status:       newStatus,
        lastSeenAt:   new Date(),
      },
      { where: { id: user.id } }
    );

    logger.debug('[reputation] recorded success', {
      username,
      successCount: newSuccessCount,
      bytes,
      speed,
      qualityScore,
    });
  }

  /**
   * Record a failed download from a user
   */
  async recordFailure(username: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const settings = this.getSettings();
    const user = await this.findOrCreateUser(username);

    const newFailureCount = user.failureCount + 1;

    // Determine if user should be auto-flagged
    // Note: We flag, not block - manual review is required to block
    let newStatus = user.status;

    if (user.status === 'neutral' && newFailureCount >= settings.autoFlagThreshold) {
      newStatus = 'flagged';
      logger.info('[reputation] auto-flagging user', { username, failureCount: newFailureCount });
    }

    await SlskdUser.update(
      {
        failureCount: newFailureCount,
        status:       newStatus,
        lastSeenAt:   new Date(),
      },
      { where: { id: user.id } }
    );

    logger.debug('[reputation] recorded failure', {
      username,
      failureCount: newFailureCount,
    });
  }

  /**
   * Update user status manually
   */
  async updateStatus(id: string, status: SlskdUserStatus, notes?: string): Promise<SlskdUser | null> {
    const user = await SlskdUser.findByPk(id);

    if (!user) {
      return null;
    }

    const updates: Partial<SlskdUserAttributes> = { status };

    if (notes !== undefined) {
      updates.notes = notes;
    }

    await SlskdUser.update(updates, { where: { id } });

    logger.info('[reputation] updated user status', {
      username: user.username, status, notes 
    });

    return SlskdUser.findByPk(id);
  }

  /**
   * Delete a user record
   */
  async deleteUser(id: string): Promise<boolean> {
    const deleted = await SlskdUser.destroy({ where: { id } });

    return deleted > 0;
  }

  /**
   * Check if a user is blocked
   */
  async isBlocked(username: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    const user = await this.getUserByUsername(username);

    return user?.status === 'blocked';
  }

  /**
   * Get score bonus for trusted users
   * Returns +100 for trusted users, 0 otherwise
   */
  async getScoreBonus(username: string): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    const user = await this.getUserByUsername(username);

    return user?.status === 'trusted' ? 100 : 0;
  }

  /**
   * Filter search responses to exclude blocked users
   */
  async filterByReputation(responses: SlskdSearchResponse[]): Promise<SlskdSearchResponse[]> {
    if (!this.isEnabled()) {
      return responses;
    }

    // Get all blocked usernames
    const blockedUsers = await SlskdUser.findAll({
      where:      { status: 'blocked' },
      attributes: ['username'],
    });

    const blockedSet = new Set(blockedUsers.map((u) => u.username.toLowerCase()));

    if (blockedSet.size === 0) {
      return responses;
    }

    const filtered = responses.filter((response) => {
      const isBlocked = blockedSet.has(response.username.toLowerCase());

      if (isBlocked) {
        logger.debug('[reputation] filtering blocked user from results', { username: response.username });
      }

      return !isBlocked;
    });

    if (filtered.length < responses.length) {
      logger.info('[reputation] filtered blocked users from search results', {
        original: responses.length,
        filtered: filtered.length,
        removed:  responses.length - filtered.length,
      });
    }

    return filtered;
  }

  /**
   * Get users with filtering and pagination
   */
  async getUsers(filters: UserFilters = {}): Promise<{ items: SlskdUser[]; total: number }> {
    const {
      status, search, limit = 50, offset = 0 
    } = filters;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.username = { [Op.like]: `%${ search.toLowerCase() }%` };
    }

    const { rows: items, count: total } = await SlskdUser.findAndCountAll({
      where,
      limit,
      offset,
      order: [['lastSeenAt', 'DESC']],
    });

    return { items, total };
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStats> {
    const [total, neutral, trusted, flagged, blocked] = await Promise.all([
      SlskdUser.count(),
      SlskdUser.count({ where: { status: 'neutral' } }),
      SlskdUser.count({ where: { status: 'trusted' } }),
      SlskdUser.count({ where: { status: 'flagged' } }),
      SlskdUser.count({ where: { status: 'blocked' } }),
    ]);

    return {
      total, neutral, trusted, flagged, blocked 
    };
  }

  /**
   * Export user lists for backup/sharing
   */
  async exportUsers(): Promise<UserExport> {
    const [trusted, blocked, flagged] = await Promise.all([
      SlskdUser.findAll({ where: { status: 'trusted' }, attributes: ['username'] }),
      SlskdUser.findAll({ where: { status: 'blocked' }, attributes: ['username'] }),
      SlskdUser.findAll({ where: { status: 'flagged' }, attributes: ['username'] }),
    ]);

    return {
      trusted: trusted.map((u) => u.username),
      blocked: blocked.map((u) => u.username),
      flagged: flagged.map((u) => u.username),
    };
  }

  /**
   * Import user lists from backup/sharing
   * Creates or updates users with specified statuses
   */
  async importUsers(data: UserImport): Promise<{ imported: number; updated: number }> {
    let imported = 0;
    let updated = 0;

    const importList = async(usernames: string[] | undefined, status: SlskdUserStatus) => {
      if (!usernames?.length) {
        return;
      }

      for (const username of usernames) {
        const normalizedUsername = username.toLowerCase().trim();

        if (!normalizedUsername) {
          continue;
        }

        const existingUser = await this.getUserByUsername(normalizedUsername);

        if (existingUser) {
          if (existingUser.status !== status) {
            await this.updateStatus(existingUser.id, status);
            updated++;
          }
        } else {
          await SlskdUser.create({
            username: normalizedUsername,
            status,
          });
          imported++;
        }
      }
    };

    await importList(data.trusted, 'trusted');
    await importList(data.blocked, 'blocked');
    await importList(data.flagged, 'flagged');

    logger.info('[reputation] imported users', { imported, updated });

    return { imported, updated };
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateStatus(ids: string[], status: SlskdUserStatus): Promise<number> {
    const [affectedCount] = await SlskdUser.update(
      { status },
      { where: { id: { [Op.in]: ids } } }
    );

    logger.info('[reputation] bulk updated user status', { count: affectedCount, status });

    return affectedCount;
  }

  /**
   * Reset user to neutral status
   */
  async resetUser(id: string): Promise<SlskdUser | null> {
    return this.updateStatus(id, 'neutral');
  }
}

export const userReputationService = new UserReputationService();
