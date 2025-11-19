-- CreateIndex
CREATE INDEX "idx_applications_dashboard" ON "applications"("job_id", "status", "applied_at" DESC);

-- CreateIndex
CREATE INDEX "idx_job_skills_matching" ON "job_skills"("skill_id");

-- CreateIndex
CREATE INDEX "idx_search_analytics_performance" ON "search_history"("searched_at" DESC, "search_type");
