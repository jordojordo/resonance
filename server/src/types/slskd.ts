/**
 * Types for slskd downloader job processing
 */

import type { SlskdFile, SlskdSearchResponse } from '@server/types/slskd-client';
import type { SearchQueryBuilder } from '@server/services/SearchQueryBuilder';

/**
 * Supported audio formats detected from file extensions
 */
export type AudioFormat = 'flac' | 'wav' | 'alac' | 'aiff' | 'mp3' | 'm4a' | 'aac' | 'ogg' | 'opus' | 'wma' | 'unknown';

/**
 * Quality tier classification
 */
export type QualityTier = 'lossless' | 'high' | 'standard' | 'low' | 'unknown';

/**
 * Extracted quality information from file metadata
 */
export interface QualityInfo {
  format:     AudioFormat;
  bitRate:    number | null;
  bitDepth:   number | null;
  sampleRate: number | null;
  tier:       QualityTier;
}

/**
 * User preferences for audio quality filtering and scoring
 */
export interface QualityPreferences {
  enabled:          boolean;
  preferredFormats: string[];
  minBitrate:       number;
  preferLossless:   boolean;
  rejectLowQuality: boolean;
  rejectLossless:   boolean;
}

/**
 * Entry from the wishlist file with optional year metadata
 */
export interface WishlistEntry {
  artist: string;
  title:  string;
  type:   'album' | 'track';
  year?:  number;
}

/**
 * Configuration for slskd search operations
 */
export interface SearchConfig {
  queryBuilder:         SearchQueryBuilder;
  searchTimeoutMs:      number;
  maxWaitMs:            number;
  minResponseFiles:     number;
  maxResponsesToEval:   number;
  minFileSizeBytes:     number;
  maxFileSizeBytes:     number;
  preferCompleteAlbums: boolean;
  preferAlbumFolder:    boolean;
  retryEnabled:         boolean;
  maxRetryAttempts:     number;
  simplifyOnRetry:      boolean;
  retryDelayMs:         number;
  qualityPreferences?:  QualityPreferences;
}

/**
 * Options for selecting files from search results
 */
export interface FileSelectionOptions {
  minFileSizeBytes:     number;
  maxFileSizeBytes:     number;
  preferCompleteAlbums: boolean;
  preferAlbumFolder:    boolean;
  minFiles:             number;
}

/**
 * Successful search result with response and selection
 */
export interface SearchSuccessResult {
  status:    'success';
  response:  SlskdSearchResponse;
  searchId:  string;
  selection: { directory: string; files: SlskdFile[] };
}

/**
 * Failed search result
 */
export interface SearchFailedResult {
  status: 'failed';
}

/**
 * Deferred search result (will retry later)
 */
export interface SearchDeferredResult {
  status: 'deferred';
}

/**
 * Union of all possible search attempt results
 */
export type SearchAttemptResult = SearchSuccessResult | SearchFailedResult | SearchDeferredResult;
