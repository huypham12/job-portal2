-- ============================================
-- Migration: Add Recruitment Enhancements
-- Date: 2025-12-20
-- Description: Add withdrawal tracking, interview details, enhanced notifications
-- ============================================

BEGIN;

-- ========== STEP 1: Update Enums ==========
-- Thêm giá trị mới vào enum (an toàn, không drop enum cũ)
DO $$
BEGIN
  -- application_status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'interviewing' AND enumtypid = 'application_status'::regtype) THEN
    ALTER TYPE application_status ADD VALUE 'interviewing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'offered' AND enumtypid = 'application_status'::regtype) THEN
    ALTER TYPE application_status ADD VALUE 'offered';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'withdrawn' AND enumtypid = 'application_status'::regtype) THEN
    ALTER TYPE application_status ADD VALUE 'withdrawn';
  END IF;

  -- job_status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'job_status'::regtype) THEN
    ALTER TYPE job_status ADD VALUE 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'job_status'::regtype) THEN
    ALTER TYPE job_status ADD VALUE 'rejected';
  END IF;
END $$;

-- ========== STEP 2: Applications Table ==========
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS cover_letter TEXT,
  ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS withdrawn_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS offer_declined_at TIMESTAMP(6);

-- Update existing rejected applications
UPDATE applications
SET rejected_at = applied_at
WHERE status = 'rejected'
  AND rejected_at IS NULL
  AND applied_at IS NOT NULL;

-- Indexes for applications
CREATE INDEX IF NOT EXISTS idx_applications_withdrawn
  ON applications(is_withdrawn, status);

CREATE INDEX IF NOT EXISTS idx_applications_job_withdrawn
  ON applications(job_id, is_withdrawn);

CREATE INDEX IF NOT EXISTS idx_applications_profile_withdrawn
  ON applications(profile_id, is_withdrawn);

-- ========== STEP 3: Application Stages Table ==========
ALTER TABLE application_stages
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500),
  ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(50),
  ADD COLUMN IF NOT EXISTS interviewer_id UUID,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS result VARCHAR(50),
  ADD COLUMN IF NOT EXISTS candidate_feedback TEXT;

-- Indexes for application_stages
CREATE INDEX IF NOT EXISTS idx_stages_calendar
  ON application_stages(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stages_interviewer
  ON application_stages(interviewer_id)
  WHERE interviewer_id IS NOT NULL;

-- ========== STEP 4: Notifications Table ==========
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS action_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS action_text VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP(6);

-- Update existing notifications
UPDATE notifications
SET category = 'info'
WHERE category IS NULL;

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(user_id, category);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_metadata
  ON notifications USING GIN(metadata)
  WHERE metadata IS NOT NULL;

COMMIT;

