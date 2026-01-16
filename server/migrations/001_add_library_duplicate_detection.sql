-- Migration: Add Library Duplicate Detection
-- Date: 2026-01-16
-- Description: Adds LibraryAlbum table and inLibrary field to QueueItem

-- =============================================================================
-- 1. Create library_albums table
-- =============================================================================
CREATE TABLE IF NOT EXISTS `library_albums` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `navidrome_id` TEXT NOT NULL UNIQUE,
  `name` TEXT NOT NULL,
  `name_lower` TEXT NOT NULL,
  `artist` TEXT NOT NULL,
  `artist_lower` TEXT NOT NULL,
  `year` INTEGER,
  `last_synced_at` TEXT NOT NULL,
  `created_at` TEXT NOT NULL,
  `updated_at` TEXT NOT NULL
);

-- Create indexes for library_albums
CREATE INDEX IF NOT EXISTS `library_albums_navidrome_id`
  ON `library_albums` (`navidrome_id`);

CREATE INDEX IF NOT EXISTS `library_albums_name_lower_artist_lower`
  ON `library_albums` (`name_lower`, `artist_lower`);

CREATE INDEX IF NOT EXISTS `library_albums_artist_lower`
  ON `library_albums` (`artist_lower`);

-- =============================================================================
-- 2. Add in_library column to queue_items table
-- =============================================================================

-- SQLite doesn't support ADD COLUMN with DEFAULT on existing rows easily,
-- so we'll use a safe approach:

-- Step 1: Add the column (will be NULL for existing rows)
ALTER TABLE `queue_items` ADD COLUMN `in_library` INTEGER;

-- Step 2: Update existing rows to set default value (false = 0)
UPDATE `queue_items` SET `in_library` = 0 WHERE `in_library` IS NULL;

-- =============================================================================
-- 3. Create indexes for in_library field
-- =============================================================================

CREATE INDEX IF NOT EXISTS `queue_items_in_library`
  ON `queue_items` (`in_library`);

CREATE INDEX IF NOT EXISTS `queue_items_status_in_library`
  ON `queue_items` (`status`, `in_library`);

-- =============================================================================
-- Migration complete
-- =============================================================================
