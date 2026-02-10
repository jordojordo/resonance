import type { SlskdSearchResponse } from '@server/types/slskd-client';

import logger from '@server/config/logger';
import { cachedSearchResultsSchema } from '@server/types/downloads';

/**
 * Parse and validate cached search results JSON.
 */
export function parseCachedSearchResults(
  json: string,
  taskId: string
): SlskdSearchResponse[] | null {
  try {
    const parsed = JSON.parse(json);
    const parseResult = cachedSearchResultsSchema.safeParse(parsed);

    if (!parseResult.success) {
      logger.error(`Invalid search results format for task ${ taskId }`, { errors: parseResult.error.issues });

      return null;
    }

    return parseResult.data as SlskdSearchResponse[];
  } catch {
    logger.error(`Failed to parse search results for task ${ taskId }`);

    return null;
  }
}
