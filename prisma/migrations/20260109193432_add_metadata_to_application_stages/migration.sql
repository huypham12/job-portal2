-- DropIndex
DROP INDEX "idx_application_stages_app_status";

-- DropIndex
DROP INDEX "idx_application_stages_scheduled_at";

-- DropIndex
DROP INDEX "idx_applications_candidate_status";

-- DropIndex
DROP INDEX "idx_notifications_user_sent_at";

-- DropIndex
DROP INDEX "idx_profile_skills_skill_id";

-- AlterTable
ALTER TABLE "application_stages" ADD COLUMN     "metadata" JSONB;
