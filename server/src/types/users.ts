import { z } from 'zod';

/**
 * User status enum
 */
export const slskdUserStatusSchema = z.enum(['neutral', 'trusted', 'flagged', 'blocked']);

export type SlskdUserStatus = z.infer<typeof slskdUserStatusSchema>;

/**
 * Slskd user schema (API response)
 */
export const slskdUserSchema = z.object({
  id:           z.string().uuid(),
  username:     z.string(),
  status:       slskdUserStatusSchema,
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  averageSpeed: z.number().nonnegative(),
  totalBytes:   z.number().nonnegative(),
  qualityScore: z.number().int().min(0).max(100),
  notes:        z.string().nullable(),
  lastSeenAt:   z.coerce.date(),
  createdAt:    z.coerce.date(),
  updatedAt:    z.coerce.date(),
});

export type SlskdUserResponse = z.infer<typeof slskdUserSchema>;

/**
 * Query params for getting users
 */
export const getUsersQuerySchema = z.object({
  status: slskdUserStatusSchema.optional(),
  search: z.string().optional(),
  limit:  z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

/**
 * User stats schema
 */
export const userStatsSchema = z.object({
  total:   z.number().int().nonnegative(),
  neutral: z.number().int().nonnegative(),
  trusted: z.number().int().nonnegative(),
  flagged: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
});

export type UserStats = z.infer<typeof userStatsSchema>;

/**
 * Update user request schema
 */
export const updateUserRequestSchema = z.object({
  status: slskdUserStatusSchema.optional(),
  notes:  z.string().nullable().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

/**
 * Bulk update request schema
 */
export const bulkUpdateRequestSchema = z.object({
  ids:    z.array(z.string().uuid()).min(1),
  status: slskdUserStatusSchema,
});

export type BulkUpdateRequest = z.infer<typeof bulkUpdateRequestSchema>;

/**
 * Delete request schema
 */
export const deleteUserRequestSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

export type DeleteUserRequest = z.infer<typeof deleteUserRequestSchema>;

/**
 * User export schema
 */
export const userExportSchema = z.object({
  trusted: z.array(z.string()),
  blocked: z.array(z.string()),
  flagged: z.array(z.string()),
});

export type UserExport = z.infer<typeof userExportSchema>;

/**
 * User import request schema
 */
export const userImportRequestSchema = z.object({
  trusted: z.array(z.string()).optional(),
  blocked: z.array(z.string()).optional(),
  flagged: z.array(z.string()).optional(),
});

export type UserImportRequest = z.infer<typeof userImportRequestSchema>;

/**
 * User import response schema
 */
export const userImportResponseSchema = z.object({
  success:  z.boolean(),
  imported: z.number().int().nonnegative(),
  updated:  z.number().int().nonnegative(),
  message:  z.string(),
});

export type UserImportResponse = z.infer<typeof userImportResponseSchema>;
