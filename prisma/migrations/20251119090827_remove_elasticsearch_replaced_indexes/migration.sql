-- DropIndex
DROP INDEX "recruitment"."idx_company_benefits_type";

-- DropIndex
DROP INDEX "recruitment"."idx_company_lookup";

-- DropIndex
DROP INDEX "recruitment"."idx_connection_interests_contact_info_gin";

-- DropIndex
DROP INDEX "recruitment"."idx_job_benefits_type";

-- DropIndex
DROP INDEX "recruitment"."idx_job_requirements_type_level";

-- DropIndex
DROP INDEX "recruitment"."idx_job_skills_matching";

-- DropIndex
DROP INDEX "recruitment"."idx_job_recommendations";

-- DropIndex
DROP INDEX "recruitment"."idx_job_views_analytics_performance";

-- DropIndex
DROP INDEX "recruitment"."idx_job_views_job_analytics";

-- DropIndex
DROP INDEX "recruitment"."idx_job_views_recommendation";

-- DropIndex
DROP INDEX "recruitment"."idx_job_views_user_behavior";

-- DropIndex
DROP INDEX "recruitment"."idx_jobs_search_composite";

-- DropIndex
DROP INDEX "recruitment"."idx_profile_skills_matching";

-- DropIndex
DROP INDEX "recruitment"."idx_search_analytics_performance";

-- DropIndex
DROP INDEX "recruitment"."idx_search_history_analytics";

-- DropIndex
DROP INDEX "recruitment"."idx_search_history_clicked_jobs_gin";

-- DropIndex
DROP INDEX "recruitment"."idx_search_history_filters_gin";

-- DropIndex
DROP INDEX "recruitment"."idx_user_preferences_lookup";

-- DropIndex
DROP INDEX "recruitment"."idx_user_preferences_type";

-- DropIndex
DROP INDEX "recruitment"."idx_user_preferences_value_gin";

-- DropIndex
DROP INDEX "recruitment"."trigram_users_email";

-- CreateIndex
CREATE INDEX "idx_job_views_job_basic" ON "job_views"("job_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_job_views_user_basic" ON "job_views"("user_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_preferences_basic" ON "user_preferences"("user_id", "preference_type");
