import type { PartialBy } from '@sequelize/utils';

import { DataTypes, Model, sql } from '@sequelize/core';
import { sequelize } from '@server/config/db/sequelize';

/**
 * Status of an slskd user for reputation tracking
 */
export type SlskdUserStatus = 'neutral' | 'trusted' | 'flagged' | 'blocked';

/**
 * SlskdUser attributes for tracking user reputation.
 * Tracks download outcomes to identify reliable and unreliable sources.
 */
export interface SlskdUserAttributes {
  id:           string;           // UUID
  username:     string;           // Soulseek username (unique, case-insensitive)
  status:       SlskdUserStatus;  // User reputation status
  successCount: number;           // Successful download count
  failureCount: number;           // Failed download count
  averageSpeed: number;           // Average transfer speed in bytes/sec
  totalBytes:   number;           // Total bytes downloaded from user
  qualityScore: number;           // Average quality score (0-100)
  notes:        string | null;    // User-added notes
  lastSeenAt:   Date;             // Last activity timestamp
  createdAt?:   Date;
  updatedAt?:   Date;
}

export type SlskdUserCreationAttributes = PartialBy<
  SlskdUserAttributes,
  'id' | 'status' | 'successCount' | 'failureCount' | 'averageSpeed' | 'totalBytes' | 'qualityScore' | 'notes' | 'lastSeenAt'
>;

/**
 * Sequelize model for slskd user reputation tracking.
 * Tracks user reliability based on download outcomes.
 */
class SlskdUser extends Model<SlskdUserAttributes, SlskdUserCreationAttributes> implements SlskdUserAttributes {
  declare id:           string;
  declare username:     string;
  declare status:       SlskdUserStatus;
  declare successCount: number;
  declare failureCount: number;
  declare averageSpeed: number;
  declare totalBytes:   number;
  declare qualityScore: number;
  declare notes:        string | null;
  declare lastSeenAt:   Date;
  declare createdAt?:   Date;
  declare updatedAt?:   Date;
}

SlskdUser.init(
  {
    id: {
      type:         DataTypes.UUID,
      primaryKey:   true,
      defaultValue: sql.uuidV4,
    },
    username: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      unique:    true,
      comment:   'Soulseek username (case-insensitive)',
    },
    status: {
      type:         DataTypes.STRING(20),
      allowNull:    false,
      defaultValue: 'neutral',
      comment:      'User reputation status: neutral, trusted, flagged, blocked',
    },
    successCount: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      columnName:   'success_count',
      comment:      'Number of successful downloads from this user',
    },
    failureCount: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      columnName:   'failure_count',
      comment:      'Number of failed downloads from this user',
    },
    averageSpeed: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      columnName:   'average_speed',
      comment:      'Average transfer speed in bytes per second',
    },
    totalBytes: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      columnName:   'total_bytes',
      comment:      'Total bytes downloaded from this user',
    },
    qualityScore: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      columnName:   'quality_score',
      comment:      'Average quality score (0-100)',
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'User-added notes about this user',
    },
    lastSeenAt: {
      type:         DataTypes.DATE,
      allowNull:    false,
      defaultValue: DataTypes.NOW,
      columnName:   'last_seen_at',
      comment:      'When this user was last seen in download activity',
    },
  },
  {
    sequelize,
    tableName:   'slskd_users',
    underscored: true,
    indexes:     [
      { fields: ['status'] },
    ],
  },
);

export default SlskdUser;
