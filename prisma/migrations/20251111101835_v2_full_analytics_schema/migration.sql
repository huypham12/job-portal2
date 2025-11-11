/*
  Warnings:

  - You are about to drop the `company_subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_follows` table. If the table is not empty, all the data it contains will be lost.

*/

-- ======================================================
-- MANUAL DATABASE CHANGES - RUN BEFORE AND AFTER MIGRATION
-- ======================================================

-- ======================================================
-- PART 1: RUN BEFORE MIGRATION - Drop Views and Dependencies
-- ======================================================

-- Step 1: Drop materialized views that depend on tables we're going to delete
-- ======================================================

-- Drop revenue view (depends on payments, company_subscriptions, service_packages)
DROP MATERIALIZED VIEW IF EXISTS mv_report_revenue_daily CASCADE;

-- Note: Keep mv_report_job_performance and mv_report_user_growth as they don't depend on deleted tables

-- DropForeignKey
ALTER TABLE "recruitment"."company_subscriptions" DROP CONSTRAINT "company_subscriptions_company_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."company_subscriptions" DROP CONSTRAINT "company_subscriptions_package_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."company_subscriptions" DROP CONSTRAINT "company_subscriptions_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."payments" DROP CONSTRAINT "payments_company_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."reports" DROP CONSTRAINT "reports_reporter_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."user_follows" DROP CONSTRAINT "user_follows_follower_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."user_follows" DROP CONSTRAINT "user_follows_following_id_fkey";

-- AlterTable
ALTER TABLE "search_history" ADD COLUMN     "clicked_jobs" JSONB DEFAULT '[]',
ADD COLUMN     "filters_used" JSONB DEFAULT '{}',
ADD COLUMN     "result_count" INTEGER DEFAULT 0,
ADD COLUMN     "session_id" UUID;

-- DropTable
DROP TABLE "recruitment"."company_subscriptions";

-- DropTable
DROP TABLE "recruitment"."payments";

-- DropTable
DROP TABLE "recruitment"."reports";

-- DropTable
DROP TABLE "recruitment"."service_packages";

-- DropTable
DROP TABLE "recruitment"."user_follows";

-- CreateTable
CREATE TABLE "connection_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "job_id" UUID,
    "interest_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "contact_info" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "responded_at" TIMESTAMP(6),

    CONSTRAINT "connection_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "job_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "duration_seconds" INTEGER,
    "source" TEXT DEFAULT 'direct',
    "referrer_job_id" UUID,

    CONSTRAINT "job_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_similarities" (
    "job1_id" UUID NOT NULL,
    "job2_id" UUID NOT NULL,
    "similarity_score" DECIMAL(5,4) NOT NULL,
    "similarity_type" TEXT NOT NULL DEFAULT 'hybrid',
    "calculated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_similarities_pkey" PRIMARY KEY ("job1_id","job2_id","similarity_type")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "preference_type" TEXT NOT NULL,
    "preference_value" JSONB NOT NULL,
    "weight" DECIMAL(3,2) DEFAULT 1.0,
    "source" TEXT DEFAULT 'explicit',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_connection_interests_candidate_status" ON "connection_interests"("candidate_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_connection_interests_recruiter_status" ON "connection_interests"("recruiter_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_connection_interests_job" ON "connection_interests"("job_id", "status");

-- CreateIndex
CREATE INDEX "idx_connection_interests_expires" ON "connection_interests"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "connection_interests_candidate_id_recruiter_id_job_id_inter_key" ON "connection_interests"("candidate_id", "recruiter_id", "job_id", "interest_type");

-- CreateIndex
CREATE INDEX "idx_job_views_job_analytics" ON "job_views"("job_id", "viewed_at" DESC, "duration_seconds");

-- CreateIndex
CREATE INDEX "idx_job_views_user_behavior" ON "job_views"("user_id", "viewed_at" DESC, "source");

-- CreateIndex
CREATE INDEX "idx_job_views_recommendation" ON "job_views"("referrer_job_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_job_similarities_lookup" ON "job_similarities"("job1_id", "similarity_score" DESC, "similarity_type");

-- CreateIndex
CREATE INDEX "idx_job_similarities_reverse" ON "job_similarities"("job2_id", "similarity_score" DESC, "similarity_type");

-- CreateIndex
CREATE INDEX "idx_user_preferences_lookup" ON "user_preferences"("user_id", "preference_type", "weight" DESC);

-- CreateIndex
CREATE INDEX "idx_user_preferences_type" ON "user_preferences"("preference_type", "weight" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_preference_type_key" ON "user_preferences"("user_id", "preference_type");

-- CreateIndex
CREATE INDEX "idx_search_history_session" ON "search_history"("user_id", "session_id", "searched_at");

-- CreateIndex
CREATE INDEX "idx_search_history_analytics" ON "search_history"("search_type", "searched_at" DESC, "result_count");

-- AddForeignKey
ALTER TABLE "connection_interests" ADD CONSTRAINT "connection_interests_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_interests" ADD CONSTRAINT "connection_interests_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_interests" ADD CONSTRAINT "connection_interests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_referrer_job_id_fkey" FOREIGN KEY ("referrer_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_similarities" ADD CONSTRAINT "job_similarities_job1_id_fkey" FOREIGN KEY ("job1_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_similarities" ADD CONSTRAINT "job_similarities_job2_id_fkey" FOREIGN KEY ("job2_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ======================================================
-- PART 2: RUN AFTER MIGRATION - Add Constraints and Recreate Views
-- ======================================================

-- Step 2: Add CHECK CONSTRAINTS (not supported by Prisma)
-- ======================================================

-- Connection interests constraints
ALTER TABLE connection_interests
ADD CONSTRAINT check_interest_type
CHECK (interest_type IN ('candidate_to_recruiter', 'recruiter_to_candidate'));

ALTER TABLE connection_interests
ADD CONSTRAINT check_status
CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));

-- Job views constraints
ALTER TABLE job_views
ADD CONSTRAINT check_source
CHECK (source IN ('search', 'recommendation', 'direct', 'connection'));

-- Job similarities constraints
ALTER TABLE job_similarities
ADD CONSTRAINT check_similarity_score
CHECK (similarity_score BETWEEN 0 AND 1);

ALTER TABLE job_similarities
ADD CONSTRAINT check_similarity_type
CHECK (similarity_type IN ('content', 'skill', 'behavior', 'location', 'hybrid'));

ALTER TABLE job_similarities
ADD CONSTRAINT check_job_order
CHECK (job1_id < job2_id);

-- User preferences constraints
ALTER TABLE user_preferences
ADD CONSTRAINT check_preference_type
CHECK (preference_type IN ('salary_range', 'location', 'job_type', 'company_size', 'skills', 'industry'));

ALTER TABLE user_preferences
ADD CONSTRAINT check_weight
CHECK (weight BETWEEN 0 AND 1);

ALTER TABLE user_preferences
ADD CONSTRAINT check_source_type
CHECK (source IN ('explicit', 'implicit', 'inferred'));

-- Step 2: Set default expires_at for connection_interests
-- ======================================================

-- Update expires_at to be 30 days from created_at for existing records
UPDATE connection_interests
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- Create a function to set expires_at automatically
CREATE OR REPLACE FUNCTION set_connection_expires_at() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at = NEW.created_at + INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expires_at
DROP TRIGGER IF EXISTS trigger_set_connection_expires_at ON connection_interests;
CREATE TRIGGER trigger_set_connection_expires_at
    BEFORE INSERT ON connection_interests
    FOR EACH ROW EXECUTE FUNCTION set_connection_expires_at();

-- Step 3: Function to expire connection interests
-- ======================================================

CREATE OR REPLACE FUNCTION expire_connection_interests() RETURNS void AS $$
BEGIN
    UPDATE connection_interests
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Function to handle duplicate views (1-hour window)
-- ======================================================

CREATE OR REPLACE FUNCTION handle_job_view_insert() RETURNS TRIGGER AS $$
BEGIN
    -- Check if there's already a view for this user/job in the last hour
    IF EXISTS (
        SELECT 1 FROM job_views
        WHERE user_id = NEW.user_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour')
    ) THEN
        -- Update the existing record instead of inserting
        UPDATE job_views
        SET viewed_at = NEW.viewed_at,
            duration_seconds = GREATEST(duration_seconds, NEW.duration_seconds),
            source = NEW.source
        WHERE user_id = NEW.user_id
        AND job_id = NEW.job_id
        AND viewed_at > (NEW.viewed_at - INTERVAL '1 hour');

        -- Return NULL to prevent the insert
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for job views deduplication
DROP TRIGGER IF EXISTS trigger_job_view_dedup ON job_views;
CREATE TRIGGER trigger_job_view_dedup
    BEFORE INSERT ON job_views
    FOR EACH ROW EXECUTE FUNCTION handle_job_view_insert();

-- Step 5: Trigger to update user_preferences.updated_at
-- ======================================================

-- Create function to update timestamp (reuse existing if available)
CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user preferences
DROP TRIGGER IF EXISTS set_user_preferences_timestamp ON user_preferences;
CREATE TRIGGER set_user_preferences_timestamp
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Step 6: Additional optimizations
-- ======================================================

-- Create partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connection_interests_pending
ON connection_interests(expires_at, candidate_id, recruiter_id)
WHERE status = 'pending';


-- Create GIN index for JSONB columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_connection_interests_contact_info_gin
ON connection_interests USING GIN (contact_info);

CREATE INDEX IF NOT EXISTS idx_user_preferences_value_gin
ON user_preferences USING GIN (preference_value);

CREATE INDEX IF NOT EXISTS idx_search_history_clicked_jobs_gin
ON search_history USING GIN (clicked_jobs);

CREATE INDEX IF NOT EXISTS idx_search_history_filters_gin
ON search_history USING GIN (filters_used);

-- Step 8: Recreate and create new materialized views
-- ======================================================

-- Recreate job performance view (this wasn't affected by table deletion)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_report_job_performance;

-- Recreate user growth view (this wasn't affected by table deletion)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_report_user_growth;

-- Create new materialized views for the new features
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_report_connection_analytics AS
SELECT
    DATE_TRUNC('day', ci.created_at) AS report_day,
    ci.interest_type,
    ci.status,
    COUNT(ci.id) AS connections_count,
    COUNT(CASE WHEN ci.status = 'accepted' THEN 1 END) AS accepted_count,
    COUNT(CASE WHEN ci.status = 'declined' THEN 1 END) AS declined_count,
    COUNT(CASE WHEN ci.status = 'expired' THEN 1 END) AS expired_count,
    AVG(CASE
        WHEN ci.responded_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (ci.responded_at - ci.created_at))/3600
    END) AS avg_response_hours
FROM connection_interests ci
GROUP BY report_day, ci.interest_type, ci.status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_connection_analytics_day_type_status
ON mv_report_connection_analytics (report_day, interest_type, status);

-- Job views analytics view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_report_job_views AS
SELECT
    DATE_TRUNC('day', jv.viewed_at) AS report_day,
    jv.job_id,
    j.company_id,
    jv.source,
    COUNT(jv.id) AS total_views,
    COUNT(DISTINCT jv.user_id) AS unique_viewers,
    AVG(jv.duration_seconds) AS avg_duration_seconds,
    COUNT(CASE WHEN jv.referrer_job_id IS NOT NULL THEN 1 END) AS referral_views
FROM job_views jv
LEFT JOIN jobs j ON jv.job_id = j.id
WHERE jv.viewed_at IS NOT NULL
GROUP BY report_day, jv.job_id, j.company_id, jv.source;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_job_views_day_job_source
ON mv_report_job_views (report_day, job_id, source);

CREATE INDEX IF NOT EXISTS idx_mv_job_views_company
ON mv_report_job_views (company_id, report_day);

-- User preferences analytics view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_report_user_preferences AS
SELECT
    up.preference_type,
    up.source,
    COUNT(up.id) AS users_count,
    AVG(up.weight) AS avg_weight,
    COUNT(CASE WHEN up.source = 'explicit' THEN 1 END) AS explicit_count,
    COUNT(CASE WHEN up.source = 'implicit' THEN 1 END) AS implicit_count,
    COUNT(CASE WHEN up.source = 'inferred' THEN 1 END) AS inferred_count
FROM user_preferences up
GROUP BY up.preference_type, up.source;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_preferences_type_source
ON mv_report_user_preferences (preference_type, source);

-- Search analytics view (enhanced with new columns)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_report_search_analytics AS
SELECT
    DATE_TRUNC('day', sh.searched_at) AS report_day,
    sh.search_type,
    COUNT(sh.id) AS total_searches,
    COUNT(DISTINCT sh.user_id) AS unique_searchers,
    COUNT(DISTINCT sh.session_id) AS unique_sessions,
    AVG(sh.result_count) AS avg_result_count,
    AVG(jsonb_array_length(sh.clicked_jobs)) as avg_clicks_per_search,
    COUNT(CASE WHEN sh.result_count = 0 THEN 1 END) AS zero_result_searches
FROM search_history sh
WHERE sh.searched_at IS NOT NULL
GROUP BY report_day, sh.search_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_search_analytics_day_type
ON mv_report_search_analytics (report_day, search_type);

-- Step 9: Create helper functions for recommendations
-- ======================================================

-- Function to get similar jobs
CREATE OR REPLACE FUNCTION get_similar_jobs(
    p_job_id UUID,
    p_similarity_type TEXT DEFAULT 'hybrid',
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    similar_job_id UUID,
    similarity_score DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN js.job1_id = p_job_id THEN js.job2_id
            ELSE js.job1_id
        END as similar_job_id,
        js.similarity_score
    FROM job_similarities js
    WHERE (js.job1_id = p_job_id OR js.job2_id = p_job_id)
    AND js.similarity_type = p_similarity_type
    ORDER BY js.similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user job compatibility score
CREATE OR REPLACE FUNCTION calculate_user_job_score(
    p_user_id UUID,
    p_job_id UUID
) RETURNS DECIMAL(5,4) AS $$
DECLARE
    total_score DECIMAL(10,6) := 0;
    total_weight DECIMAL(10,6) := 0;
    pref_record RECORD;
    job_data RECORD;
BEGIN
    -- Get job details
    SELECT * INTO job_data FROM jobs WHERE id = p_job_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Calculate score based on user preferences
    FOR pref_record IN
        SELECT preference_type, preference_value, weight
        FROM user_preferences
        WHERE user_id = p_user_id
    LOOP
        CASE pref_record.preference_type
            WHEN 'salary_range' THEN
                -- Add salary matching logic here
                total_score := total_score + (pref_record.weight * 0.5); -- Placeholder

            WHEN 'location' THEN
                -- Add location matching logic here
                IF job_data.location_id IS NOT NULL THEN
                    total_score := total_score + (pref_record.weight * 0.8); -- Placeholder
                END IF;

            WHEN 'job_type' THEN
                -- Add job type matching logic here
                IF job_data.job_type IS NOT NULL THEN
                    total_score := total_score + (pref_record.weight * 1.0); -- Placeholder
                END IF;
        END CASE;

        total_weight := total_weight + pref_record.weight;
    END LOOP;

    -- Return normalized score
    IF total_weight > 0 THEN
        RETURN LEAST((total_score / total_weight)::DECIMAL(5,4), 1.0000);
    ELSE
        RETURN 0.0000;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create scheduled job to clean up expired connections
-- ======================================================

-- Note: This would typically be set up as a cron job or scheduled task
-- For PostgreSQL with pg_cron extension:
-- SELECT cron.schedule('expire-connections', '0 */6 * * *', 'SELECT expire_connection_interests();');

COMMIT;

-- ======================================================
-- VERIFICATION QUERIES
-- ======================================================

-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'recruitment'
AND table_name IN (
    'connection_interests',
    'job_views',
    'job_similarities',
    'user_preferences'
);

-- Verify constraints exist
SELECT conname, contype
FROM pg_constraint
WHERE conrelid IN (
    SELECT oid
    FROM pg_class
    WHERE relname IN (
        'connection_interests',
        'job_views',
        'job_similarities',
        'user_preferences'
    )
);

-- Count records in new tables (should be 0 initially)
SELECT
    'connection_interests' as table_name, COUNT(*) as record_count
FROM connection_interests
UNION ALL
SELECT
    'job_views', COUNT(*)
FROM job_views
UNION ALL
SELECT
    'job_similarities', COUNT(*)
FROM job_similarities
UNION ALL
SELECT
    'user_preferences', COUNT(*)
FROM user_preferences;
