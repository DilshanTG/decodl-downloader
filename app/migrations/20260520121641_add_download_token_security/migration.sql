-- Add downloadToken column using PostgreSQL's gen_random_uuid() so existing rows
-- are automatically populated with unique tokens (no NULL rows, no manual backfill).
ALTER TABLE "Download" ADD COLUMN "downloadToken" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT;
