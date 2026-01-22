import type { Request, Response } from 'express';
import type { PaginatedResponse } from '@server/types/responses';
import type { SlskdUserResponse, UserStats, UserExport, UserImportResponse } from '@server/types/users';

import { BaseController } from '@server/controllers/BaseController';
import logger from '@server/config/logger';
import {
  getUsersQuerySchema,
  updateUserRequestSchema,
  bulkUpdateRequestSchema,
  deleteUserRequestSchema,
  userImportRequestSchema,
  userStatsSchema,
  userExportSchema,
} from '@server/types/users';
import { sendValidationError } from '@server/utils/errorHandler';
import { userReputationService } from '@server/services/UserReputationService';
import SlskdUser from '@server/models/SlskdUser';

/**
 * Users controller for managing slskd user reputation
 */
class UsersController extends BaseController {
  /**
   * Convert Sequelize model to plain object for API response
   */
  private modelToPlainObject(user: SlskdUser): SlskdUserResponse {
    return {
      id:           user.id,
      username:     user.username,
      status:       user.status,
      successCount: user.successCount,
      failureCount: user.failureCount,
      averageSpeed: user.averageSpeed,
      totalBytes:   Number(user.totalBytes),
      qualityScore: user.qualityScore,
      notes:        user.notes,
      lastSeenAt:   user.lastSeenAt,
      createdAt:    user.createdAt!,
      updatedAt:    user.updatedAt!,
    };
  }

  /**
   * Get users with filtering and pagination
   * GET /api/v1/users
   */
  getUsers = async(req: Request, res: Response): Promise<Response> => {
    try {
      const parseResult = getUsersQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return sendValidationError(res, 'Invalid query parameters', { errors: parseResult.error.issues });
      }

      const {
        status, search, limit, offset 
      } = parseResult.data;

      const { items: dbItems, total } = await userReputationService.getUsers({
        status,
        search,
        limit,
        offset,
      });

      const items = dbItems.map((user) => this.modelToPlainObject(user));

      const response: PaginatedResponse<SlskdUserResponse> = {
        items,
        total,
        limit,
        offset,
      };

      return res.json(response);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to fetch users');
    }
  };

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  getStats = async(req: Request, res: Response): Promise<Response> => {
    try {
      const stats = await userReputationService.getStats();

      const parseResult = userStatsSchema.safeParse(stats);

      if (!parseResult.success) {
        throw new Error('Invalid stats data from service');
      }

      const response: UserStats = parseResult.data;

      return res.json(response);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to fetch user stats');
    }
  };

  /**
   * Get a single user by ID
   * GET /api/v1/users/:id
   */
  getUser = async(req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const user = await userReputationService.getUser(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json(this.modelToPlainObject(user));
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to fetch user');
    }
  };

  /**
   * Update a user
   * PUT /api/v1/users/:id
   */
  updateUser = async(req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const parseResult = updateUserRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return sendValidationError(res, 'Invalid request body', { errors: parseResult.error.issues });
      }

      const { status, notes } = parseResult.data;

      const user = await userReputationService.getUser(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let updatedUser = user;

      if (status) {
        const notesStr = notes ?? undefined;

        updatedUser = await userReputationService.updateStatus(id, status, notesStr) ?? user;
      } else if (notes !== undefined) {
        await SlskdUser.update({ notes }, { where: { id } });
        updatedUser = await userReputationService.getUser(id) ?? user;
      }

      logger.debug('Updated user', {
        id, status, notes 
      });

      return res.json(this.modelToPlainObject(updatedUser));
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to update user');
    }
  };

  /**
   * Bulk update users
   * PUT /api/v1/users/bulk
   */
  bulkUpdate = async(req: Request, res: Response): Promise<Response> => {
    try {
      const parseResult = bulkUpdateRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return sendValidationError(res, 'Invalid request body', { errors: parseResult.error.issues });
      }

      const { ids, status } = parseResult.data;

      const count = await userReputationService.bulkUpdateStatus(ids, status);

      return res.json({
        success: true,
        count,
        message: `Updated ${ count } user(s) to ${ status }`,
      });
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to bulk update users');
    }
  };

  /**
   * Delete users
   * DELETE /api/v1/users
   */
  deleteUsers = async(req: Request, res: Response): Promise<Response> => {
    try {
      const parseResult = deleteUserRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return sendValidationError(res, 'Invalid request body', { errors: parseResult.error.issues });
      }

      const { ids } = parseResult.data;

      let deleted = 0;

      for (const id of ids) {
        const success = await userReputationService.deleteUser(id);

        if (success) {
          deleted++;
        }
      }

      return res.json({
        success: true,
        count:   deleted,
        message: `Deleted ${ deleted } user(s)`,
      });
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to delete users');
    }
  };

  /**
   * Export user lists
   * POST /api/v1/users/export
   */
  exportUsers = async(req: Request, res: Response): Promise<Response> => {
    try {
      const exportData = await userReputationService.exportUsers();

      const parseResult = userExportSchema.safeParse(exportData);

      if (!parseResult.success) {
        throw new Error('Invalid export data from service');
      }

      const response: UserExport = parseResult.data;

      return res.json(response);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to export users');
    }
  };

  /**
   * Import user lists
   * POST /api/v1/users/import
   */
  importUsers = async(req: Request, res: Response): Promise<Response> => {
    try {
      const parseResult = userImportRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return sendValidationError(res, 'Invalid request body', { errors: parseResult.error.issues });
      }

      const result = await userReputationService.importUsers(parseResult.data);

      const response: UserImportResponse = {
        success:  true,
        imported: result.imported,
        updated:  result.updated,
        message:  `Imported ${ result.imported } new user(s), updated ${ result.updated } existing user(s)`,
      };

      return res.json(response);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to import users');
    }
  };
}

export default new UsersController();
