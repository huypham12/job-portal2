-- Migration: Add application notification features
-- This migration adds enhanced notification fields, application tracking fields, 
-- connection interest suggested jobs, and interview stage enhancements

-- ============================================
-- 1. ENHANCE NOTIFICATIONS TABLE
-- ============================================
ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "title" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "action_url" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "action_text" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "category" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(6);

-- Create index for category
CREATE INDEX IF NOT EXISTS "idx_notifications_category" ON "notifications"("category");

-- ============================================
-- 2. ENHANCE APPLICATIONS TABLE
-- ============================================
ALTER TABLE "applications"
ADD COLUMN IF NOT EXISTS "cover_letter" TEXT,
ADD COLUMN IF NOT EXISTS "is_withdrawn" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "withdrawn_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "withdrawn_reason" TEXT,
ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "rejected_reason" TEXT,
ADD COLUMN IF NOT EXISTS "first_viewed_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "last_viewed_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "view_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "offer_sent_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "offer_accepted_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "offer_declined_at" TIMESTAMP(6);

-- ============================================
-- 3. ENHANCE APPLICATION_STAGES TABLE
-- ============================================
ALTER TABLE "application_stages"
ADD COLUMN IF NOT EXISTS "candidate_feedback" TEXT,
ADD COLUMN IF NOT EXISTS "location" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "meeting_link" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "meeting_password" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "interviewer_id" UUID,
ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER,
ADD COLUMN IF NOT EXISTS "result" VARCHAR(50);

-- ============================================
-- 4. ENHANCE CONNECTION_INTERESTS TABLE
-- ============================================
ALTER TABLE "connection_interests"
ADD COLUMN IF NOT EXISTS "suggested_job_ids" JSONB;

-- ============================================
-- 5. UPDATE APPLICATION_STATUS ENUM
-- ============================================
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in transaction
-- We need to add these values separately if they don't exist
DO $$ 
BEGIN
    -- Add 'interviewing' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'interviewing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'application_status')) THEN
        ALTER TYPE "application_status" ADD VALUE 'interviewing';
    END IF;
    
    -- Add 'offered' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'offered' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'application_status')) THEN
        ALTER TYPE "application_status" ADD VALUE 'offered';
    END IF;
    
    -- Add 'withdrawn' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'withdrawn' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'application_status')) THEN
        ALTER TYPE "application_status" ADD VALUE 'withdrawn';
    END IF;
END $$;

