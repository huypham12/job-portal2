/*
  Warnings:

  - Added the required column `title` to the `resumes` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `resumes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `resumes` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "resume_source" AS ENUM ('created', 'uploaded');

-- Step 1: Add new columns with temporary nullable/default values
ALTER TABLE "resumes"
ADD COLUMN "file_name" VARCHAR(255),
ADD COLUMN "file_size" INTEGER,
ADD COLUMN "is_default" BOOLEAN DEFAULT false,
ADD COLUMN "is_public" BOOLEAN DEFAULT false,
ADD COLUMN "mime_type" VARCHAR(100),
ADD COLUMN "source_type" "resume_source" DEFAULT 'created',
ADD COLUMN "status" VARCHAR(20) DEFAULT 'draft',
ADD COLUMN "title" VARCHAR(255);

-- Step 2: Update existing NULL values before setting NOT NULL constraints
UPDATE "resumes" SET "title" = 'My Resume' WHERE "title" IS NULL;
UPDATE "resumes" SET "source_type" = 'created' WHERE "source_type" IS NULL;
UPDATE "resumes" SET "status" = 'draft' WHERE "status" IS NULL;
UPDATE "resumes" SET "is_default" = false WHERE "is_default" IS NULL;
UPDATE "resumes" SET "is_public" = false WHERE "is_public" IS NULL;
UPDATE "resumes" SET "created_at" = NOW() WHERE "created_at" IS NULL;
UPDATE "resumes" SET "updated_at" = NOW() WHERE "updated_at" IS NULL;

-- Step 3: Set NOT NULL constraints after data is clean
ALTER TABLE "resumes"
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "source_type" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "is_default" SET NOT NULL,
ALTER COLUMN "is_public" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- Step 4: Add constraints for data integrity
ALTER TABLE "resumes"
ADD CONSTRAINT "check_resume_status"
CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE "resumes"
ADD CONSTRAINT "check_file_size_limit"
CHECK (file_size IS NULL OR file_size <= 5242880);

ALTER TABLE "resumes"
ADD CONSTRAINT "check_created_cv_has_content"
CHECK (
  (source_type = 'created' AND content IS NOT NULL)
  OR
  (source_type = 'uploaded' AND file_url IS NOT NULL AND file_size IS NOT NULL)
);

-- Step 5: Create unique index for default resume per profile
CREATE UNIQUE INDEX "resumes_profile_id_is_default_unique"
ON "resumes"("profile_id", "is_default")
WHERE "is_default" = true;

-- Step 6: Add comments for documentation
COMMENT ON TABLE "resumes" IS 'User resumes/CVs - created from profile or uploaded files';
COMMENT ON COLUMN "resumes"."content" IS 'Full CV structure: data + layout + template settings (JSON)';
COMMENT ON COLUMN "resumes"."source_type" IS 'created = frontend-rendered with template, uploaded = static PDF';
COMMENT ON COLUMN "resumes"."file_url" IS 'S3 URL of generated or uploaded PDF';
COMMENT ON COLUMN "resumes"."is_default" IS 'Default CV for job applications';
COMMENT ON COLUMN "resumes"."is_public" IS 'Public shareable CV link';
COMMENT ON COLUMN "resumes"."status" IS 'draft, active, archived';

-- CreateIndex
CREATE INDEX "resumes_profile_id_is_default_idx" ON "resumes"("profile_id", "is_default");

-- CreateIndex
CREATE INDEX "resumes_profile_id_status_idx" ON "resumes"("profile_id", "status");

-- CreateIndex
CREATE INDEX "resumes_profile_id_source_type_idx" ON "resumes"("profile_id", "source_type");

-- RenameIndex
ALTER INDEX "idx_resumes_profile" RENAME TO "resumes_profile_id_idx";
