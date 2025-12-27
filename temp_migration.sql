-- CreateEnum
CREATE TYPE "resume_source" AS ENUM ('created', 'uploaded');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('pending', 'reviewed', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('draft', 'approved', 'closed');

-- CreateEnum
CREATE TYPE "job_type" AS ENUM ('full_time', 'part_time', 'contract');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "report_target_type" AS ENUM ('job', 'user', 'company');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'expired', 'cancelled', 'pending_payment');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('candidate', 'recruiter', 'admin');

-- CreateEnum
CREATE TYPE "user_token_type" AS ENUM ('verify_email', 'reset_password');

-- CreateEnum
CREATE TYPE "location_type" AS ENUM ('province', 'district');

-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('industry', 'technical', 'work_type');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "resume_id" UUID,
    "status" "application_status" DEFAULT 'pending',
    "applied_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "version" INTEGER DEFAULT 1,
    "profile_id" UUID NOT NULL,
    "cover_letter" TEXT,
    "is_withdrawn" BOOLEAN DEFAULT false,
    "withdrawn_at" TIMESTAMP(6),
    "withdrawn_reason" TEXT,
    "rejected_at" TIMESTAMP(6),
    "rejected_reason" TEXT,
    "first_viewed_at" TIMESTAMP(6),
    "last_viewed_at" TIMESTAMP(6),
    "view_count" INTEGER DEFAULT 0,
    "offer_sent_at" TIMESTAMP(6),
    "offer_accepted_at" TIMESTAMP(6),
    "offer_declined_at" TIMESTAMP(6),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "stage_name" VARCHAR(100) NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "scheduled_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "feedback" TEXT,
    "rating" INTEGER,
    "interviewer_notes" TEXT,
    "candidate_feedback" TEXT,
    "location" VARCHAR(255),
    "meeting_link" VARCHAR(500),
    "meeting_password" VARCHAR(100),
    "interviewer_id" UUID,
    "duration_minutes" INTEGER,
    "result" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "file_url" TEXT NOT NULL,
    "original_filename" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" BIGSERIAL NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT,
    "action" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "user_id" UUID,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "recruiter_id" UUID,
    "logo_url" TEXT,
    "size" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(20),
    "contact_address" TEXT,
    "linkedin_url" VARCHAR(255),
    "facebook_url" VARCHAR(255),
    "twitter_url" VARCHAR(255),
    "tax_code" VARCHAR(50),
    "business_license" VARCHAR(100),
    "is_verified" BOOLEAN DEFAULT false,
    "verification_date" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'active',

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "industry" VARCHAR(100),
    "founded_year" INTEGER,
    "employee_count_min" INTEGER,
    "employee_count_max" INTEGER,
    "website_url" VARCHAR(255),
    "headquarters_location_id" UUID,
    "company_type" VARCHAR(50),
    "revenue_range" VARCHAR(50),
    "stock_symbol" VARCHAR(10),
    "culture_description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "company_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_benefits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "benefit_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posts_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_posts_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "job_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("job_id","skill_id")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "job_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("job_id","category_id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_id" UUID,
    "location_id" UUID,
    "salary_range" JSONB,
    "job_type" "job_type",
    "experience_level" INTEGER,
    "posted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "status" "job_status" DEFAULT 'draft',
    "metadata" JSONB,
    "version" INTEGER DEFAULT 1,
    "deleted" BOOLEAN DEFAULT false,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "requirement_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "level" VARCHAR(50),
    "years_experience" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_benefits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "benefit_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "value_amount" DECIMAL(15,2),
    "value_currency" VARCHAR(10) DEFAULT 'VND',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_work_arrangements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "is_remote_allowed" BOOLEAN NOT NULL DEFAULT false,
    "remote_percentage" INTEGER NOT NULL DEFAULT 0,
    "flexible_hours" BOOLEAN NOT NULL DEFAULT false,
    "travel_requirement" VARCHAR(50),
    "overtime_expected" BOOLEAN NOT NULL DEFAULT false,
    "shift_type" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_work_arrangements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "type" "location_type" NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "title" VARCHAR(255),
    "action_url" VARCHAR(500),
    "action_text" VARCHAR(100),
    "metadata" JSONB,
    "category" VARCHAR(50),
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMP(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "avatar_url" TEXT,
    "location_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "bio" TEXT,
    "date_of_birth" DATE,
    "desired_currency" VARCHAR(10) DEFAULT 'VND',
    "desired_job_title" VARCHAR(255),
    "desired_job_type" "job_type"[] DEFAULT ARRAY[]::"job_type"[],
    "desired_salary_min" INTEGER,
    "display_name" VARCHAR(255),
    "full_name" VARCHAR(255) NOT NULL,
    "gender" VARCHAR(20),
    "github_url" VARCHAR(255),
    "headline" VARCHAR(255),
    "is_looking_for_job" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "linkedin_url" VARCHAR(255),
    "location_text" VARCHAR(100),
    "personal_website" VARCHAR(255),
    "phone_number" VARCHAR(20),
    "years_of_experience" INTEGER DEFAULT 0,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_skills" (
    "profile_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency" INTEGER,
    "level" TEXT,

    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("profile_id","skill_id")
);

-- CreateTable
CREATE TABLE "profile_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "profile_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_educations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "school_name" VARCHAR(255) NOT NULL,
    "degree" VARCHAR(255),
    "field_of_study" VARCHAR(255),
    "start_date" DATE NOT NULL,
    "end_date" DATE,

    CONSTRAINT "profile_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_certifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "issuing_org" VARCHAR(255) NOT NULL,
    "credential_id" VARCHAR(255),
    "credential_url" VARCHAR(255),
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "never_expires" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "skills_acquired" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "profile_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_awards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "issuer" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "url" VARCHAR(255),
    "category" VARCHAR(100),
    "level" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "profile_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" INET,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "revoked_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "source_type" "resume_source" NOT NULL DEFAULT 'created',
    "content" JSONB,
    "file_url" TEXT,
    "file_name" VARCHAR(255),
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role" "user_role" NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "roles_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "saved_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "profile_id" UUID NOT NULL,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" BIGSERIAL NOT NULL,
    "search_query" JSONB NOT NULL,
    "search_type" TEXT NOT NULL,
    "searched_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "clicked_jobs" JSONB DEFAULT '[]',
    "filters_used" JSONB DEFAULT '{}',
    "result_count" INTEGER DEFAULT 0,
    "session_id" UUID,
    "profile_id" UUID NOT NULL,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" "category_type" NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

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
    "suggested_job_ids" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "responded_at" TIMESTAMP(6),

    CONSTRAINT "connection_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "duration_seconds" INTEGER,
    "source" TEXT DEFAULT 'direct',
    "referrer_job_id" UUID,
    "profile_id" UUID,

    CONSTRAINT "job_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tokens" (
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "user_token_type" NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "verified" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,
    "version" INTEGER DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_activity_logs_user" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_activity_timeline" ON "activity_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_applications_job" ON "applications"("job_id");

-- CreateIndex
CREATE INDEX "idx_applications_profile_job" ON "applications"("profile_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_applications_pipeline" ON "applications"("job_id", "status", "applied_at");

-- CreateIndex
CREATE INDEX "idx_applications_dashboard" ON "applications"("job_id", "status", "applied_at" DESC);

-- CreateIndex
CREATE INDEX "idx_application_stages_order" ON "application_stages"("application_id", "stage_order");

-- CreateIndex
CREATE INDEX "idx_application_stages_scheduling" ON "application_stages"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "idx_application_documents_app" ON "application_documents"("application_id");

-- CreateIndex
CREATE INDEX "idx_application_documents_type" ON "application_documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_audits_table_record" ON "audits"("table_name", "record_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_recruiter_id_key" ON "companies"("recruiter_id");

-- CreateIndex
CREATE INDEX "idx_companies_elasticsearch_sync" ON "companies"("updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "company_details_company_id_key" ON "company_details"("company_id");

-- CreateIndex
CREATE INDEX "idx_company_benefits_company" ON "company_benefits"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_posts_history_job_id_version_key" ON "job_posts_history"("job_id", "version");

-- CreateIndex
CREATE INDEX "idx_job_categories_job" ON "job_categories"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_categories_category" ON "job_categories"("category_id");

-- CreateIndex
CREATE INDEX "idx_jobs_company" ON "jobs"("company_id");

-- CreateIndex
CREATE INDEX "idx_jobs_location" ON "jobs"("location_id");

-- CreateIndex
CREATE INDEX "idx_jobs_posted_at" ON "jobs"("posted_at");

-- CreateIndex
CREATE INDEX "idx_jobs_status" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "idx_jobs_expiration" ON "jobs"("expires_at");

-- CreateIndex
CREATE INDEX "idx_jobs_elasticsearch_sync" ON "jobs"("updated_at", "id");

-- CreateIndex
CREATE INDEX "idx_job_requirements_job" ON "job_requirements"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_benefits_job" ON "job_benefits"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_work_arrangements_job_id_key" ON "job_work_arrangements"("job_id");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "notifications"("user_id", "read", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_category" ON "notifications"("category");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_is_looking_for_job_idx" ON "profiles"("is_looking_for_job");

-- CreateIndex
CREATE INDEX "idx_profiles_elasticsearch_sync" ON "profiles"("updated_at", "id");

-- CreateIndex
CREATE INDEX "profile_experiences_profile_id_idx" ON "profile_experiences"("profile_id");

-- CreateIndex
CREATE INDEX "profile_educations_profile_id_idx" ON "profile_educations"("profile_id");

-- CreateIndex
CREATE INDEX "profile_certifications_profile_id_idx" ON "profile_certifications"("profile_id");

-- CreateIndex
CREATE INDEX "idx_certifications_expiry" ON "profile_certifications"("expiry_date");

-- CreateIndex
CREATE INDEX "profile_awards_profile_id_idx" ON "profile_awards"("profile_id");

-- CreateIndex
CREATE INDEX "idx_awards_category" ON "profile_awards"("category");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "resumes_profile_id_idx" ON "resumes"("profile_id");

-- CreateIndex
CREATE INDEX "resumes_profile_id_is_default_idx" ON "resumes"("profile_id", "is_default");

-- CreateIndex
CREATE INDEX "resumes_profile_id_status_idx" ON "resumes"("profile_id", "status");

-- CreateIndex
CREATE INDEX "resumes_profile_id_source_type_idx" ON "resumes"("profile_id", "source_type");

-- CreateIndex
CREATE UNIQUE INDEX "roles_permissions_role_permission_key" ON "roles_permissions"("role", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "saved_jobs_profile_id_job_id_key" ON "saved_jobs"("profile_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_search_history_profile_time" ON "search_history"("profile_id", "searched_at" DESC);

-- CreateIndex
CREATE INDEX "idx_search_history_session" ON "search_history"("profile_id", "session_id", "searched_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "idx_categories_type" ON "categories"("type");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "idx_skills_category" ON "skills"("category_id");

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
CREATE INDEX "idx_job_views_job_basic" ON "job_views"("job_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_job_views_profile_basic" ON "job_views"("profile_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_tokens_expires_at" ON "user_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_tokens_user_id_type" ON "user_tokens"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_details" ADD CONSTRAINT "company_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_details" ADD CONSTRAINT "company_details_headquarters_location_id_fkey" FOREIGN KEY ("headquarters_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_benefits" ADD CONSTRAINT "company_benefits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts_history" ADD CONSTRAINT "job_posts_history_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_requirements" ADD CONSTRAINT "job_requirements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_benefits" ADD CONSTRAINT "job_benefits_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_arrangements" ADD CONSTRAINT "job_work_arrangements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profile_experiences" ADD CONSTRAINT "profile_experiences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_educations" ADD CONSTRAINT "profile_educations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_certifications" ADD CONSTRAINT "profile_certifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_awards" ADD CONSTRAINT "profile_awards_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "connection_interests" ADD CONSTRAINT "connection_interests_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_interests" ADD CONSTRAINT "connection_interests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_interests" ADD CONSTRAINT "connection_interests_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_referrer_job_id_fkey" FOREIGN KEY ("referrer_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

