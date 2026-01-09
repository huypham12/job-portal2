-- CreateIndex
CREATE INDEX "idx_application_stages_app_status" ON "application_stages"("application_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "idx_application_stages_scheduled_at" ON "application_stages"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_applications_candidate_status" ON "applications"("profile_id", "status", "applied_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_user_sent_at" ON "notifications"("user_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "idx_profile_skills_skill_id" ON "profile_skills"("skill_id");
