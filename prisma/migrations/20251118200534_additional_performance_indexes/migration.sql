-- Additional Performance Indexes for Job Portal
-- Run this after the main migration for optimal search and recommendation performance

-- 1. GiST Index for Salary Range Queries (using int4range)
-- This allows efficient range queries for salary filtering
CREATE INDEX idx_jobs_salary_range_gist
ON recruitment.jobs USING gist (
    int4range(
        COALESCE((salary_range->>'min')::int, 0),
        COALESCE((salary_range->>'max')::int, 999999999)
    )
) WHERE status = 'approved' AND deleted = false;

-- 2. Partial Indexes for Active Data Only (Save space and improve performance)
CREATE INDEX idx_jobs_active_search
ON recruitment.jobs (status, location_id, job_type, posted_at DESC)
WHERE status = 'approved' AND deleted = false;

-- 3. Connection Interest Matching Optimization
CREATE INDEX idx_connection_active_matching
ON recruitment.connection_interests (candidate_id, status, created_at DESC)
WHERE status IN ('pending', 'accepted');

-- 4. Search Analytics for Performance Monitoring
CREATE INDEX idx_search_analytics_performance
ON recruitment.search_history (searched_at DESC, search_type)
INCLUDE (result_count, user_id);

-- 5. Job Views for Recommendation Engine (Only meaningful views)
CREATE INDEX idx_job_views_recommendation_engine
ON recruitment.job_views (user_id, viewed_at DESC, duration_seconds DESC)
WHERE duration_seconds > 30 AND user_id IS NOT NULL;

-- 6. Full-text search indexes for better search performance
CREATE INDEX idx_job_requirements_fulltext
ON recruitment.job_requirements USING gin (
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

CREATE INDEX idx_job_benefits_fulltext
ON recruitment.job_benefits USING gin (
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

CREATE INDEX idx_company_benefits_fulltext
ON recruitment.company_benefits USING gin (
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

-- 7. Composite indexes for complex queries
CREATE INDEX idx_applications_dashboard
ON recruitment.applications (job_id, status, applied_at DESC)
INCLUDE (user_id, resume_id);

CREATE INDEX idx_jobs_location_salary
ON recruitment.jobs (location_id, status)
INCLUDE (salary_range, job_type, posted_at)
WHERE status = 'approved' AND deleted = false;

-- 8. User preferences lookup optimization
CREATE INDEX idx_user_preferences_weighted
ON recruitment.user_preferences (user_id, preference_type, weight DESC)
INCLUDE (preference_value);

-- 9. Skills matching for recommendation system
CREATE INDEX idx_job_skills_matching
ON recruitment.job_skills (skill_id)
INCLUDE (job_id);

-- 10. Company size range optimization for company search
CREATE INDEX idx_company_details_size_industry
ON recruitment.company_details (industry, employee_count_min, employee_count_max)
WHERE industry IS NOT NULL;

-- 11. Notification performance index
CREATE INDEX idx_notifications_unread_recent
ON recruitment.notifications (user_id, sent_at DESC)
WHERE read = false;

-- 12. Job expiration cleanup index
CREATE INDEX idx_jobs_cleanup
ON recruitment.jobs (expires_at)
WHERE expires_at IS NOT NULL AND status = 'approved';

-- 13. Search conversion tracking for analytics
CREATE INDEX idx_search_conversion_tracking
ON recruitment.search_history (user_id, searched_at DESC)
INCLUDE (clicked_jobs, result_count);

-- Add constraints for data integrity
ALTER TABLE recruitment.application_stages
ADD CONSTRAINT check_stage_rating
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));

ALTER TABLE recruitment.company_cultures
ADD CONSTRAINT check_culture_rating
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

ALTER TABLE recruitment.job_work_arrangements
ADD CONSTRAINT check_remote_percentage
CHECK (remote_percentage >= 0 AND remote_percentage <= 100);

-- Update existing jobs to have updated_at timestamp
UPDATE recruitment.jobs
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION recruitment.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON recruitment.jobs
    FOR EACH ROW
    EXECUTE FUNCTION recruitment.update_updated_at_column();

CREATE TRIGGER update_company_details_updated_at
    BEFORE UPDATE ON recruitment.company_details
    FOR EACH ROW
    EXECUTE FUNCTION recruitment.update_updated_at_column();
