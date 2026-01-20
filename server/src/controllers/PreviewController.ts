import type { Request, Response } from 'express';
import type { PreviewResponse, AlbumPreviewResponse } from '@server/types/preview';

import { BaseController } from '@server/controllers/BaseController';
import { previewQuerySchema, albumPreviewQuerySchema } from '@server/types/preview';
import { sendValidationError } from '@server/utils/errorHandler';
import { PreviewService } from '@server/services/PreviewService';

/**
 * Preview controller for fetching audio preview URLs
 */
class PreviewController extends BaseController {
  private previewService: PreviewService;

  constructor() {
    super();
    this.previewService = new PreviewService();
  }

  /**
   * Get preview URL for a track
   * GET /api/v1/preview?artist=X&track=Y
   */
  getPreview = async(req: Request, res: Response): Promise<Response> => {
    try {
      const parseResult = previewQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return sendValidationError(res, 'Invalid query parameters', { errors: parseResult.error.issues });
      }

      const { artist, track } = parseResult.data;

      const preview: PreviewResponse = await this.previewService.getPreview(artist, track);

      return res.json(preview);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to fetch preview');
    }
  };

  /**
   * Get preview URL for an album
   * GET /api/v1/preview/album?artist=X&album=Y&mbid=Z&sourceTrack=W
   */
  getAlbumPreview = async(req: Request, res: Response): Promise<Response> => {
    try {
      const parseResult = albumPreviewQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return sendValidationError(res, 'Invalid query parameters', { errors: parseResult.error.issues });
      }

      const preview: AlbumPreviewResponse = await this.previewService.getAlbumPreview(parseResult.data);

      return res.json(preview);
    } catch(error) {
      return this.handleError(res, error as Error, 'Failed to fetch album preview');
    }
  };
}

export default new PreviewController();
