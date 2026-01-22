import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest';

import { UserReputationService } from './UserReputationService';
import SlskdUser from '@server/models/SlskdUser';
import * as settings from '@server/config/settings';

// Mock the SlskdUser model
vi.mock('@server/models/SlskdUser', () => ({
  default: {
    findOrCreate:    vi.fn(),
    findByPk:        vi.fn(),
    findOne:         vi.fn(),
    findAll:         vi.fn(),
    findAndCountAll: vi.fn(),
    update:          vi.fn(),
    destroy:         vi.fn(),
    create:          vi.fn(),
    count:           vi.fn(),
  },
}));

// Mock logger
vi.mock('@server/config/logger', () => ({
  default: {
    info:  vi.fn(),
    debug: vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
  },
}));

describe('UserReputationService', () => {
  let service: UserReputationService;

  beforeEach(() => {
    service = new UserReputationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isEnabled', () => {
    it('returns false when feature is disabled', () => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({ slskd: { host: 'http://localhost', api_key: 'test' } } as any);

      expect(service.isEnabled()).toBe(false);
    });

    it('returns true when feature is enabled', () => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: { enabled: true },
        },
      } as any);

      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('findOrCreateUser', () => {
    it('normalizes username to lowercase', async() => {
      const mockUser = {
        id: '123', username: 'testuser', status: 'neutral' 
      };

      vi.mocked(SlskdUser.findOrCreate).mockResolvedValue([mockUser as any, true]);

      await service.findOrCreateUser('TestUser');

      expect(SlskdUser.findOrCreate).toHaveBeenCalledWith({
        where:    { username: 'testuser' },
        defaults: { username: 'testuser' },
      });
    });

    it('returns the found or created user', async() => {
      const mockUser = {
        id: '123', username: 'testuser', status: 'neutral' 
      };

      vi.mocked(SlskdUser.findOrCreate).mockResolvedValue([mockUser as any, true]);

      const result = await service.findOrCreateUser('TestUser');

      expect(result).toEqual(mockUser);
    });
  });

  describe('recordSuccess', () => {
    beforeEach(() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: {
            enabled:              true,
            auto_trust_threshold: 3,
            track_quality:        true,
          },
        },
      } as any);
    });

    it('does nothing when feature is disabled', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({ slskd: { host: 'http://localhost', api_key: 'test' } } as any);

      await service.recordSuccess('testuser', {
        bytes: 1000, speed: 500, qualityScore: 80 
      });

      expect(SlskdUser.findOrCreate).not.toHaveBeenCalled();
    });

    it('increments success count', async() => {
      const mockUser = {
        id:           '123',
        username:     'testuser',
        status:       'neutral',
        successCount: 1,
        failureCount: 0,
        totalBytes:   5000,
        averageSpeed: 400,
        qualityScore: 70,
      };

      vi.mocked(SlskdUser.findOrCreate).mockResolvedValue([mockUser as any, false]);
      vi.mocked(SlskdUser.update).mockResolvedValue([1] as any);

      await service.recordSuccess('testuser', {
        bytes: 1000, speed: 600, qualityScore: 90 
      });

      expect(SlskdUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          successCount: 2,
          totalBytes:   6000,
        }),
        { where: { id: '123' } }
      );
    });

    it('auto-trusts user after threshold', async() => {
      const mockUser = {
        id:           '123',
        username:     'testuser',
        status:       'neutral',
        successCount: 2,
        failureCount: 0,
        totalBytes:   5000,
        averageSpeed: 400,
        qualityScore: 70,
      };

      vi.mocked(SlskdUser.findOrCreate).mockResolvedValue([mockUser as any, false]);
      vi.mocked(SlskdUser.update).mockResolvedValue([1] as any);

      await service.recordSuccess('testuser', {
        bytes: 1000, speed: 600, qualityScore: 90 
      });

      expect(SlskdUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          successCount: 3,
          status:       'trusted',
        }),
        { where: { id: '123' } }
      );
    });
  });

  describe('recordFailure', () => {
    beforeEach(() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: {
            enabled:             true,
            auto_flag_threshold: 2,
          },
        },
      } as any);
    });

    it('does nothing when feature is disabled', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({ slskd: { host: 'http://localhost', api_key: 'test' } } as any);

      await service.recordFailure('testuser');

      expect(SlskdUser.findOrCreate).not.toHaveBeenCalled();
    });

    it('increments failure count', async() => {
      const mockUser = {
        id:           '123',
        username:     'testuser',
        status:       'neutral',
        successCount: 0,
        failureCount: 0,
      };

      vi.mocked(SlskdUser.findOrCreate).mockResolvedValue([mockUser as any, false]);
      vi.mocked(SlskdUser.update).mockResolvedValue([1] as any);

      await service.recordFailure('testuser');

      expect(SlskdUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          failureCount: 1,
          status:       'neutral',
        }),
        { where: { id: '123' } }
      );
    });

    it('auto-flags user after threshold', async() => {
      const mockUser = {
        id:           '123',
        username:     'testuser',
        status:       'neutral',
        successCount: 0,
        failureCount: 1,
      };

      vi.mocked(SlskdUser.findOrCreate).mockResolvedValue([mockUser as any, false]);
      vi.mocked(SlskdUser.update).mockResolvedValue([1] as any);

      await service.recordFailure('testuser');

      expect(SlskdUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          failureCount: 2,
          status:       'flagged',
        }),
        { where: { id: '123' } }
      );
    });
  });

  describe('isBlocked', () => {
    it('returns false when feature is disabled', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({ slskd: { host: 'http://localhost', api_key: 'test' } } as any);

      const result = await service.isBlocked('testuser');

      expect(result).toBe(false);
    });

    it('returns true when user is blocked', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: { enabled: true },
        },
      } as any);

      vi.mocked(SlskdUser.findOne).mockResolvedValue({ status: 'blocked' } as any);

      const result = await service.isBlocked('testuser');

      expect(result).toBe(true);
    });

    it('returns false when user is not blocked', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: { enabled: true },
        },
      } as any);

      vi.mocked(SlskdUser.findOne).mockResolvedValue({ status: 'neutral' } as any);

      const result = await service.isBlocked('testuser');

      expect(result).toBe(false);
    });
  });

  describe('getScoreBonus', () => {
    it('returns 0 when feature is disabled', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({ slskd: { host: 'http://localhost', api_key: 'test' } } as any);

      const result = await service.getScoreBonus('testuser');

      expect(result).toBe(0);
    });

    it('returns 100 for trusted users', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: { enabled: true },
        },
      } as any);

      vi.mocked(SlskdUser.findOne).mockResolvedValue({ status: 'trusted' } as any);

      const result = await service.getScoreBonus('testuser');

      expect(result).toBe(100);
    });

    it('returns 0 for non-trusted users', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: { enabled: true },
        },
      } as any);

      vi.mocked(SlskdUser.findOne).mockResolvedValue({ status: 'neutral' } as any);

      const result = await service.getScoreBonus('testuser');

      expect(result).toBe(0);
    });
  });

  describe('filterByReputation', () => {
    it('returns all responses when feature is disabled', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({ slskd: { host: 'http://localhost', api_key: 'test' } } as any);

      const responses = [
        { username: 'user1', files: [] },
        { username: 'user2', files: [] },
      ];

      const result = await service.filterByReputation(responses as any);

      expect(result).toEqual(responses);
    });

    it('filters out blocked users', async() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: { enabled: true },
        },
      } as any);

      vi.mocked(SlskdUser.findAll).mockResolvedValue([
        { username: 'blockeduser' },
      ] as any);

      const responses = [
        { username: 'user1', files: [] },
        { username: 'BlockedUser', files: [] },
        { username: 'user2', files: [] },
      ];

      const result = await service.filterByReputation(responses as any);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.username)).toEqual(['user1', 'user2']);
    });
  });

  describe('getStats', () => {
    it('returns user counts by status', async() => {
      vi.mocked(SlskdUser.count).mockImplementation((options: any) => {
        if (!options) return Promise.resolve(10);
        if (options.where?.status === 'neutral') return Promise.resolve(5);
        if (options.where?.status === 'trusted') return Promise.resolve(3);
        if (options.where?.status === 'flagged') return Promise.resolve(1);
        if (options.where?.status === 'blocked') return Promise.resolve(1);

        return Promise.resolve(0);
      });

      const stats = await service.getStats();

      expect(stats).toEqual({
        total:   10,
        neutral: 5,
        trusted: 3,
        flagged: 1,
        blocked: 1,
      });
    });
  });

  describe('exportUsers', () => {
    it('returns lists of users by status', async() => {
      vi.mocked(SlskdUser.findAll).mockImplementation((options: any) => {
        if (options.where?.status === 'trusted') {
          return Promise.resolve([{ username: 'trusted1' }, { username: 'trusted2' }] as any);
        }
        if (options.where?.status === 'blocked') {
          return Promise.resolve([{ username: 'blocked1' }] as any);
        }
        if (options.where?.status === 'flagged') {
          return Promise.resolve([{ username: 'flagged1' }] as any);
        }

        return Promise.resolve([]);
      });

      const result = await service.exportUsers();

      expect(result).toEqual({
        trusted: ['trusted1', 'trusted2'],
        blocked: ['blocked1'],
        flagged: ['flagged1'],
      });
    });
  });

  describe('importUsers', () => {
    beforeEach(() => {
      vi.spyOn(settings, 'getConfig').mockReturnValue({
        slskd: {
          host:            'http://localhost',
          api_key:         'test',
          user_reputation: { enabled: true },
        },
      } as any);
    });

    it('creates new users with specified status', async() => {
      vi.mocked(SlskdUser.findOne).mockResolvedValue(null);
      vi.mocked(SlskdUser.create).mockResolvedValue({ id: '123' } as any);

      const result = await service.importUsers({
        trusted: ['user1', 'user2'],
        blocked: ['user3'],
      });

      expect(SlskdUser.create).toHaveBeenCalledTimes(3);
      expect(result.imported).toBe(3);
    });

    it('updates existing users with different status', async() => {
      vi.mocked(SlskdUser.findOne).mockResolvedValue({
        id:       '123',
        username: 'existinguser',
        status:   'neutral',
      } as any);
      vi.mocked(SlskdUser.findByPk).mockResolvedValue({
        id:       '123',
        username: 'existinguser',
        status:   'trusted',
      } as any);
      vi.mocked(SlskdUser.update).mockResolvedValue([1] as any);

      const result = await service.importUsers({ trusted: ['existinguser'] });

      expect(result.updated).toBe(1);
      expect(result.imported).toBe(0);
    });
  });
});
