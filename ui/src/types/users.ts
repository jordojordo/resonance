/**
 * User status enum for reputation tracking
 */
export type SlskdUserStatus = 'neutral' | 'trusted' | 'flagged' | 'blocked';

/**
 * Slskd user representation for UI
 */
export interface SlskdUser {
  id:           string;
  username:     string;
  status:       SlskdUserStatus;
  successCount: number;
  failureCount: number;
  averageSpeed: number;
  totalBytes:   number;
  qualityScore: number;
  notes:        string | null;
  lastSeenAt:   Date;
  createdAt:    Date;
  updatedAt:    Date;
}

/**
 * User statistics
 */
export interface UserStats {
  total:   number;
  neutral: number;
  trusted: number;
  flagged: number;
  blocked: number;
}

/**
 * User filters for listing
 */
export interface UserFilters {
  status?: SlskdUserStatus;
  search?: string;
  limit:   number;
  offset:  number;
}

/**
 * User export data structure
 */
export interface UserExport {
  trusted: string[];
  blocked: string[];
  flagged: string[];
}

/**
 * User import request
 */
export interface UserImport {
  trusted?: string[];
  blocked?: string[];
  flagged?: string[];
}

/**
 * User import response
 */
export interface UserImportResponse {
  success:  boolean;
  imported: number;
  updated:  number;
  message:  string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  status?: SlskdUserStatus;
  notes?:  string | null;
}

/**
 * Bulk update request
 */
export interface BulkUpdateRequest {
  ids:    string[];
  status: SlskdUserStatus;
}
