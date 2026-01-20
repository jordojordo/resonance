import axios from 'axios';
import logger from '@server/config/logger';
import type { SpotifyTokenResponse, SpotifySearchResponse } from '@server/types/preview';

const AUTH_URL = 'https://accounts.spotify.com/api/token';
const API_URL = 'https://api.spotify.com/v1';

/**
 * SpotifyClient provides access to Spotify API for track preview URLs.
 * Requires client credentials (client_id and client_secret) from config.
 * Uses Client Credentials OAuth flow.
 * https://developer.spotify.com/documentation/web-api
 */
export class SpotifyClient {
  private clientId:     string;
  private clientSecret: string;
  private accessToken:  string | null = null;
  private tokenExpiry:  number = 0;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Search for a track and get its preview URL
   */
  async searchTrack(artist: string, track: string): Promise<string | null> {
    try {
      await this.ensureAccessToken();

      const query = `artist:${ artist } track:${ track }`;
      const response = await axios.get<SpotifySearchResponse>(`${ API_URL }/search`, {
        params: {
          q:     query,
          type:  'track',
          limit: 5,
        },
        headers: { Authorization: `Bearer ${ this.accessToken }` },
        timeout: 10000,
      });

      const tracks = response.data.tracks?.items || [];

      // Find first track with preview URL
      const trackWithPreview = tracks.find((t) => t.preview_url);

      if (trackWithPreview?.preview_url) {
        return trackWithPreview.preview_url;
      }

      return null;
    } catch(error) {
      if (axios.isAxiosError(error)) {
        logger.debug(`Spotify search failed for '${ artist } - ${ track }': ${ error.message }`);
      } else {
        logger.debug(`Spotify search failed for '${ artist } - ${ track }': ${ String(error) }`);
      }

      return null;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAccessToken(): Promise<void> {
    // Check if token is still valid (with 60 second buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return;
    }

    const credentials = Buffer.from(`${ this.clientId }:${ this.clientSecret }`).toString('base64');

    const response = await axios.post<SpotifyTokenResponse>(AUTH_URL, 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${ credentials }`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

    logger.debug('Spotify access token refreshed');
  }
}

export default SpotifyClient;
