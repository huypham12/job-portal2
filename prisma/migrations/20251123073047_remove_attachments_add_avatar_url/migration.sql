-- ============================================
-- Migration: Remove attachments table and add avatar_url to profiles
-- ============================================

-- Step 1: Add avatar_url column to profiles table
ALTER TABLE recruitment.profiles 
ADD COLUMN avatar_url TEXT;

-- Step 2: Drop index on attachments table (must be done before dropping the table)
DROP INDEX IF EXISTS recruitment.idx_attachments_owner;

-- Step 3: Drop attachments table
DROP TABLE IF EXISTS recruitment.attachments;

-- Step 4: Drop enum attachment_owner_type (no longer needed)
DROP TYPE IF EXISTS recruitment.attachment_owner_type;
