import axios from 'axios';
import logger from '@server/config/logger';
import type { DeezerSearchResponse, DeezerSearchResult } from '@server/types/preview';

const BASE_URL = 'https://api.deezer.com';

/**
 * DeezerClient provides access to Deezer API for track preview URLs.
 * No API key required for search endpoint.
 * https://developers.deezer.com/api
 */
export class DeezerClient {
  /**
   * Search for a track and get its preview URL
   */
  async searchTrack(artist: string, track: string): Promise<string | null> {
    try {
      // Try exact search first
      const exactQuery = `artist:"${ artist }" track:"${ track }"`;
      let result = await this.search(exactQuery);

      if (result) {
        return result.preview;
      }

      // Fallback to looser search
      const looseQuery = `${ artist } ${ track }`;

      result = await this.search(looseQuery);

      if (result) {
        return result.preview;
      }

      return null;
    } catch(error) {
      if (axios.isAxiosError(error)) {
        logger.debug(`Deezer search failed for '${ artist } - ${ track }': ${ error.message }`);
      } else {
        logger.debug(`Deezer search failed for '${ artist } - ${ track }': ${ String(error) }`);
      }

      return null;
    }
  }

  /**
   * Execute search query against Deezer API
   */
  private async search(query: string): Promise<DeezerSearchResult | null> {
    const response = await axios.get<DeezerSearchResponse>(`${ BASE_URL }/search`, {
      params:  { q: query },
      timeout: 10000,
    });

    const { data } = response.data;

    if (!data || data.length === 0) {
      return null;
    }

    // Return first result with a preview URL
    const resultWithPreview = data.find((item) => item.preview && item.preview.length > 0);

    return resultWithPreview || null;
  }
}

export default DeezerClient;
