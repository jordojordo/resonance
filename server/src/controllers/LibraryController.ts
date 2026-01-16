import type { Request, Response } from 'express';

import { BaseController } from '@server/controllers/BaseController';
import { LibraryService } from '@server/services/LibraryService';
import { triggerJob } from '@server/plugins/jobs';
import { JOB_NAMES } from '@server/constants/jobs';

interface LibraryStatsResponse {
  totalAlbums:  number;
  lastSyncedAt: string | null;
}

interface SyncResponse {
  success: boolean;
  message: string;
}

/**
 * Library controller for managing library duplicate detection
 */
class LibraryController extends BaseController {
  private libraryService: LibraryService;

  constructor() {
    super();
    this.libraryService = new LibraryService();
  }

  /**
   * Get library statistics
   * GET /api/v1/library/stats
   */
  getStats = async(_req: Request, res: Response): Promise<Response> => {
    try {
      const stats = await this.libraryService.getStats();

      const response: LibraryStatsResponse = {
        totalAlbums:  stats.totalAlbums,
        lastSyncedAt: stats.lastSyncedAt?.toISOString() || null,
      };

      return res.json(response);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to fetch library stats');
    }
  };

  /**
   * Trigger manual library sync
   * POST /api/v1/library/sync
   */
  triggerSync = async(_req: Request, res: Response): Promise<Response> => {
    try {
      const result = triggerJob(JOB_NAMES.LIBRARY_SYNC);

      if (result === null) {
        const response: SyncResponse = {
          success: false,
          message: 'Library sync job not found',
        };

        return res.status(404).json(response);
      }

      if (result === false) {
        const response: SyncResponse = {
          success: false,
          message: 'Library sync is already running',
        };

        return res.status(409).json(response);
      }

      const response: SyncResponse = {
        success: true,
        message: 'Library sync started',
      };

      return res.json(response);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to trigger library sync');
    }
  };
}

export default new LibraryController();
