/*
  Warnings:

  - You are about to drop the column `user_id` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `job_views` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `resumes` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `saved_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `search_history` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[profile_id,job_id]` on the table `saved_jobs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profile_id` to the `applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `resumes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `saved_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `search_history` table without a default value. This is not possible if the table is not empty.

*/

-- Step 0: Drop materialized views that depend on user_id columns
DROP MATERIALIZED VIEW IF EXISTS "recruitment"."mv_report_job_views" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS "recruitment"."mv_report_search_analytics" CASCADE;

-- Drop functions that reference user_id in job_views
DROP FUNCTION IF EXISTS "recruitment"."handle_job_view_insert"() CASCADE;

-- Step 1: Add new profile_id columns as nullable first
ALTER TABLE "applications" ADD COLUMN "profile_id" UUID;
ALTER TABLE "resumes" ADD COLUMN "profile_id" UUID;
ALTER TABLE "saved_jobs" ADD COLUMN "profile_id" UUID;
ALTER TABLE "search_history" ADD COLUMN "profile_id" UUID;
ALTER TABLE "job_views" ADD COLUMN "profile_id" UUID;

-- Step 2: Populate profile_id columns by joining with profiles table
UPDATE "applications"
SET "profile_id" = p.id
FROM "profiles" p
WHERE "applications"."user_id" = p.user_id;

UPDATE "resumes"
SET "profile_id" = p.id
FROM "profiles" p
WHERE "resumes"."user_id" = p.user_id;

UPDATE "saved_jobs"
SET "profile_id" = p.id
FROM "profiles" p
WHERE "saved_jobs"."user_id" = p.user_id;

UPDATE "search_history"
SET "profile_id" = p.id
FROM "profiles" p
WHERE "search_history"."user_id" = p.user_id;

UPDATE "job_views"
SET "profile_id" = p.id
FROM "profiles" p
WHERE "job_views"."user_id" = p.user_id;

-- Step 3: Update connection_interests.candidate_id to point to profiles.id instead of users.id
UPDATE "connection_interests"
SET "candidate_id" = p.id
FROM "profiles" p
WHERE "connection_interests"."candidate_id" = p.user_id;

-- Step 4: Delete records that don't have corresponding profiles (non-candidates)
DELETE FROM "applications" WHERE "profile_id" IS NULL;
DELETE FROM "resumes" WHERE "profile_id" IS NULL;
DELETE FROM "saved_jobs" WHERE "profile_id" IS NULL;
DELETE FROM "search_history" WHERE "profile_id" IS NULL;
-- Keep job_views with NULL profile_id for anonymous views

-- Step 5: Make profile_id columns NOT NULL (except job_views which can be anonymous)
ALTER TABLE "applications" ALTER COLUMN "profile_id" SET NOT NULL;
ALTER TABLE "resumes" ALTER COLUMN "profile_id" SET NOT NULL;
ALTER TABLE "saved_jobs" ALTER COLUMN "profile_id" SET NOT NULL;
ALTER TABLE "search_history" ALTER COLUMN "profile_id" SET NOT NULL;

-- Step 6: Drop foreign key constraints
-- DropForeignKey
ALTER TABLE "recruitment"."applications" DROP CONSTRAINT "applications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."connection_interests" DROP CONSTRAINT "connection_interests_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."job_views" DROP CONSTRAINT "job_views_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."resumes" DROP CONSTRAINT "resumes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."saved_jobs" DROP CONSTRAINT "saved_jobs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."search_history" DROP CONSTRAINT "search_history_user_id_fkey";

-- DropIndex
DROP INDEX "recruitment"."idx_applications_user_job";

-- DropIndex
DROP INDEX "recruitment"."idx_job_views_user_basic";

-- DropIndex
DROP INDEX "recruitment"."idx_resumes_user";

-- DropIndex
DROP INDEX "recruitment"."saved_jobs_user_id_job_id_key";

-- DropIndex
DROP INDEX "recruitment"."idx_search_history_session";

-- DropIndex
DROP INDEX "recruitment"."idx_search_history_user_time";

-- Step 7: Drop old user_id columns
-- AlterTable
ALTER TABLE "applications" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "job_views" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "resumes" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "saved_jobs" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "search_history" DROP COLUMN "user_id";

-- CreateIndex
CREATE INDEX "idx_applications_profile_job" ON "applications"("profile_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_job_views_profile_basic" ON "job_views"("profile_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_resumes_profile" ON "resumes"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_jobs_profile_id_job_id_key" ON "saved_jobs"("profile_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_search_history_profile_time" ON "search_history"("profile_id", "searched_at" DESC);

-- CreateIndex
CREATE INDEX "idx_search_history_session" ON "search_history"("profile_id", "session_id", "searched_at");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "connection_interests" ADD CONSTRAINT "connection_interests_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Recreate materialized views and functions
-- Recreate the job view handling function with profile_id instead of user_id
CREATE OR REPLACE FUNCTION "recruitment"."handle_job_view_insert"() RETURNS TRIGGER AS $$
BEGIN
    -- Check if there's already a view for this profile/job in the last hour
    IF NEW.profile_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM job_views
        WHERE profile_id = NEW.profile_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour')
    ) THEN
        -- Update the existing record instead of inserting
        UPDATE job_views
        SET viewed_at = NEW.viewed_at,
            duration_seconds = GREATEST(duration_seconds, NEW.duration_seconds),
            source = NEW.source
        WHERE profile_id = NEW.profile_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour');

        -- Return NULL to prevent the insert
        RETURN NULL;
    END IF;

    -- Allow the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_job_view_dedup ON job_views;
CREATE TRIGGER trigger_job_view_dedup
    BEFORE INSERT ON job_views
    FOR EACH ROW EXECUTE FUNCTION "recruitment"."handle_job_view_insert"();

-- Recreate materialized view with profile_id references
CREATE MATERIALIZED VIEW IF NOT EXISTS "recruitment"."mv_report_job_views" AS
SELECT
    DATE_TRUNC('day', jv.viewed_at) AS report_day,
    jv.job_id,
    j.company_id,
    jv.source,
    COUNT(jv.id) AS total_views,
    COUNT(DISTINCT jv.profile_id) AS unique_viewers, -- Changed from user_id to profile_id
    AVG(jv.duration_seconds) AS avg_duration_seconds,
    COUNT(CASE WHEN jv.referrer_job_id IS NOT NULL THEN 1 END) AS referral_views
FROM job_views jv
LEFT JOIN jobs j ON jv.job_id = j.id
WHERE jv.viewed_at IS NOT NULL
GROUP BY report_day, jv.job_id, j.company_id, jv.source;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_job_views_day_job_source
ON "recruitment"."mv_report_job_views" (report_day, job_id, source);

CREATE INDEX IF NOT EXISTS idx_mv_job_views_company
ON "recruitment"."mv_report_job_views" (company_id, report_day);

-- Recreate search analytics materialized view with profile_id
CREATE MATERIALIZED VIEW IF NOT EXISTS "recruitment"."mv_report_search_analytics" AS
SELECT
    DATE_TRUNC('day', sh.searched_at) AS report_day,
    sh.search_type,
    COUNT(sh.id) AS total_searches,
    COUNT(DISTINCT sh.profile_id) AS unique_searchers, -- Changed from user_id to profile_id
    COUNT(DISTINCT sh.session_id) AS unique_sessions,
    AVG(sh.result_count) AS avg_result_count,
    AVG(jsonb_array_length(sh.clicked_jobs)) AS avg_clicks_per_search,
    COUNT(CASE WHEN sh.result_count = 0 THEN 1 END) AS zero_result_searches
FROM search_history sh
WHERE sh.searched_at IS NOT NULL
GROUP BY report_day, sh.search_type;

-- Recreate index for search analytics
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_search_analytics_day_type
ON "recruitment"."mv_report_search_analytics" (report_day, search_type);
