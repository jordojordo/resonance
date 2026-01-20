import { z } from 'zod';

/**
 * Zod schema for preview query parameters
 */
export const previewQuerySchema = z.object({
  artist: z.string().min(1),
  track:  z.string().min(1),
});

export type PreviewQuery = z.infer<typeof previewQuerySchema>;

/**
 * Preview response
 */
export interface PreviewResponse {
  url:       string | null;
  source:    'deezer' | 'spotify' | null;
  available: boolean;
}

/**
 * Deezer API types
 */
export interface DeezerSearchResult {
  id:       number;
  title:    string;
  preview:  string;
  artist:   { id: number; name: string };
  album:    { id: number; title: string; cover_medium?: string };
  duration: number;
}

export interface DeezerSearchResponse {
  data:  DeezerSearchResult[];
  total: number;
}

/**
 * Spotify API types
 */
export interface SpotifyTokenResponse {
  access_token: string;
  token_type:   string;
  expires_in:   number;
}

export interface SpotifyTrack {
  id:          string;
  name:        string;
  preview_url: string | null;
  artists:     { id: string; name: string }[];
  album:       { id: string; name: string; images: { url: string; width: number; height: number }[] };
  duration_ms: number;
}

export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}
