-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "updated_at" TIMESTAMP(6);

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
CREATE TABLE "company_cultures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "culture_aspect" VARCHAR(50) NOT NULL,
    "rating" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_cultures_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "idx_application_stages_order" ON "application_stages"("application_id", "stage_order");

-- CreateIndex
CREATE INDEX "idx_application_stages_scheduling" ON "application_stages"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "idx_application_documents_app" ON "application_documents"("application_id");

-- CreateIndex
CREATE INDEX "idx_application_documents_type" ON "application_documents"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "company_details_company_id_key" ON "company_details"("company_id");

-- CreateIndex
CREATE INDEX "idx_company_lookup" ON "company_details"("industry", "employee_count_min");

-- CreateIndex
CREATE INDEX "idx_company_benefits_company" ON "company_benefits"("company_id");

-- CreateIndex
CREATE INDEX "idx_company_benefits_type" ON "company_benefits"("benefit_type");

-- CreateIndex
CREATE INDEX "idx_company_cultures_company" ON "company_cultures"("company_id");

-- CreateIndex
CREATE INDEX "idx_job_requirements_job" ON "job_requirements"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_requirements_type_level" ON "job_requirements"("requirement_type", "level");

-- CreateIndex
CREATE INDEX "idx_job_benefits_job" ON "job_benefits"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_benefits_type" ON "job_benefits"("benefit_type");

-- CreateIndex
CREATE UNIQUE INDEX "job_work_arrangements_job_id_key" ON "job_work_arrangements"("job_id");

-- CreateIndex
CREATE INDEX "idx_user_activity_timeline" ON "activity_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_applications_pipeline" ON "applications"("job_id", "status", "applied_at");

-- CreateIndex
CREATE INDEX "idx_companies_elasticsearch_sync" ON "companies"("updated_at", "id");

-- CreateIndex
CREATE INDEX "idx_job_recommendations" ON "job_views"("user_id", "viewed_at", "duration_seconds");

-- CreateIndex
CREATE INDEX "idx_job_views_analytics_performance" ON "job_views"("job_id", "viewed_at");

-- CreateIndex
CREATE INDEX "idx_jobs_search_composite" ON "jobs"("status", "location_id", "job_type");

-- CreateIndex
CREATE INDEX "idx_jobs_expiration" ON "jobs"("expires_at");

-- CreateIndex
CREATE INDEX "idx_jobs_elasticsearch_sync" ON "jobs"("updated_at", "id");

-- CreateIndex
CREATE INDEX "idx_profile_skills_matching" ON "profile_skills"("skill_id", "level");

-- CreateIndex
CREATE INDEX "idx_profiles_elasticsearch_sync" ON "profiles"("updated_at", "id");

-- AddForeignKey
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_details" ADD CONSTRAINT "company_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_details" ADD CONSTRAINT "company_details_headquarters_location_id_fkey" FOREIGN KEY ("headquarters_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_benefits" ADD CONSTRAINT "company_benefits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_cultures" ADD CONSTRAINT "company_cultures_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requirements" ADD CONSTRAINT "job_requirements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_benefits" ADD CONSTRAINT "job_benefits_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_arrangements" ADD CONSTRAINT "job_work_arrangements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
