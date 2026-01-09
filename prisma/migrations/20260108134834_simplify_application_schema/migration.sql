-- Drop conflicting materialized view first
DROP MATERIALIZED VIEW IF EXISTS recruitment.mv_report_job_performance;

-- Fix application_status enum
BEGIN;
-- 1. normalize data trước
UPDATE recruitment.applications
SET status = 'accepted'
WHERE status = 'offered';

-- 2. tạo enum mới
CREATE TYPE "application_status_new" AS ENUM (
  'pending',
  'reviewed',
  'interviewing',
  'accepted',
  'rejected',
  'withdrawn'
);

-- 3. drop default
ALTER TABLE recruitment.applications
ALTER COLUMN status DROP DEFAULT;

-- 4. alter column
ALTER TABLE recruitment.applications
ALTER COLUMN status
TYPE "application_status_new"
USING (status::text::"application_status_new");

-- 5. swap enum
ALTER TYPE "application_status" RENAME TO "application_status_old";
ALTER TYPE "application_status_new" RENAME TO "application_status";
DROP TYPE "application_status_old";

-- 6. restore default
ALTER TABLE recruitment.applications
ALTER COLUMN status SET DEFAULT 'pending';
COMMIT;

-- Fix job_type enum - SIMPLIFIED APPROACH
BEGIN;
-- First, convert any problematic enum values to safe ones
UPDATE recruitment.jobs
SET job_type = CASE
  WHEN job_type::text = 'internship' THEN 'full_time'::job_type
  WHEN job_type::text = 'freelance' THEN 'contract'::job_type
  ELSE job_type
END
WHERE job_type::text IN ('internship', 'freelance');

-- Convert profiles array enum values
UPDATE recruitment.profiles
SET desired_job_type = CASE
  WHEN array_position(desired_job_type, 'internship'::job_type) IS NOT NULL THEN
    array_replace(desired_job_type, 'internship'::job_type, 'part_time'::job_type)
  WHEN array_position(desired_job_type, 'freelance'::job_type) IS NOT NULL THEN
    array_replace(desired_job_type, 'freelance'::job_type, 'contract'::job_type)
  ELSE desired_job_type
END
WHERE desired_job_type && ARRAY['internship'::job_type, 'freelance'::job_type];

-- Now create new enum and alter columns (safe because no problematic values remain)
CREATE TYPE "job_type_new" AS ENUM ('full_time', 'part_time', 'contract');

ALTER TABLE recruitment.profiles ALTER COLUMN desired_job_type DROP DEFAULT;

ALTER TABLE recruitment.jobs ALTER COLUMN job_type TYPE "job_type_new" USING (job_type::text::"job_type_new");
ALTER TABLE recruitment.profiles ALTER COLUMN desired_job_type TYPE "job_type_new"[] USING (desired_job_type::text::"job_type_new"[]);

ALTER TYPE "job_type" RENAME TO "job_type_old";
ALTER TYPE "job_type_new" RENAME TO "job_type";
DROP TYPE "job_type_old";

ALTER TABLE recruitment.profiles ALTER COLUMN desired_job_type SET DEFAULT ARRAY[]::job_type[];
COMMIT;

-- Drop columns from application_stages
ALTER TABLE recruitment.application_stages
  DROP COLUMN IF EXISTS candidate_feedback,
  DROP COLUMN IF EXISTS feedback,
  DROP COLUMN IF EXISTS interviewer_notes,
  DROP COLUMN IF EXISTS meeting_link,
  DROP COLUMN IF EXISTS meeting_password,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS result,
  ADD COLUMN candidate_accepted_at TIMESTAMP(6),
  ADD COLUMN candidate_declined_at TIMESTAMP(6),
  ADD COLUMN candidate_response_deadline TIMESTAMP(6),
  ADD COLUMN decision_at TIMESTAMP(6),
  ADD COLUMN decline_reason VARCHAR(255),
  ADD COLUMN recruiter_decision VARCHAR(50);

-- Drop columns from applications
ALTER TABLE recruitment.applications
  DROP COLUMN IF EXISTS first_viewed_at,
  DROP COLUMN IF EXISTS last_viewed_at,
  DROP COLUMN IF EXISTS offer_accepted_at,
  DROP COLUMN IF EXISTS offer_declined_at,
  DROP COLUMN IF EXISTS offer_sent_at,
  DROP COLUMN IF EXISTS rejected_at,
  DROP COLUMN IF EXISTS rejected_reason,
  DROP COLUMN IF EXISTS withdrawn_at;
