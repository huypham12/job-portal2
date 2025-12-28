/*
  Warnings:

  - Added the required column `title` to the `resumes` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `resumes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `resumes` required. This step will fail if there are existing NULL values in that column.

*/
-- Note: resume_source enum already exists from previous migration
-- Note: Columns file_name, file_size, is_default, is_public, mime_type, source_type, status, title
--       were already added in previous migration 20251126161505_update_resumes_table_with_full_cv_management

-- Step 1: Add columns only if they don't exist (for safety, though they should already exist)
DO $$
BEGIN
    -- Check and add file_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'file_name') THEN
        ALTER TABLE "resumes" ADD COLUMN "file_name" VARCHAR(255);
    END IF;

    -- Check and add file_size if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'file_size') THEN
        ALTER TABLE "resumes" ADD COLUMN "file_size" INTEGER;
    END IF;

    -- Check and add is_default if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'is_default') THEN
        ALTER TABLE "resumes" ADD COLUMN "is_default" BOOLEAN DEFAULT false;
    END IF;

    -- Check and add is_public if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'is_public') THEN
        ALTER TABLE "resumes" ADD COLUMN "is_public" BOOLEAN DEFAULT false;
    END IF;

    -- Check and add mime_type if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'mime_type') THEN
        ALTER TABLE "resumes" ADD COLUMN "mime_type" VARCHAR(100);
    END IF;

    -- Check and add source_type if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'source_type') THEN
        ALTER TABLE "resumes" ADD COLUMN "source_type" "resume_source" DEFAULT 'created';
    END IF;

    -- Check and add status if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'status') THEN
        ALTER TABLE "resumes" ADD COLUMN "status" VARCHAR(20) DEFAULT 'draft';
    END IF;

    -- Check and add title if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'title') THEN
        ALTER TABLE "resumes" ADD COLUMN "title" VARCHAR(255);
    END IF;
END $$;

-- Step 2: Update existing NULL values before setting NOT NULL constraints (only if columns are nullable)
DO $$
BEGIN
    -- Only update if column exists and is nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'title' AND is_nullable = 'YES') THEN
        UPDATE "resumes" SET "title" = 'My Resume' WHERE "title" IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'source_type' AND is_nullable = 'YES') THEN
        UPDATE "resumes" SET "source_type" = 'created' WHERE "source_type" IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'status' AND is_nullable = 'YES') THEN
        UPDATE "resumes" SET "status" = 'draft' WHERE "status" IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'is_default' AND is_nullable = 'YES') THEN
        UPDATE "resumes" SET "is_default" = false WHERE "is_default" IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'is_public' AND is_nullable = 'YES') THEN
        UPDATE "resumes" SET "is_public" = false WHERE "is_public" IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'created_at' AND is_nullable = 'YES') THEN
        UPDATE "resumes" SET "created_at" = NOW() WHERE "created_at" IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'updated_at' AND is_nullable = 'YES') THEN
        UPDATE "resumes" SET "updated_at" = NOW() WHERE "updated_at" IS NULL;
    END IF;
END $$;

-- Step 3: Set NOT NULL constraints after data is clean (only if columns are still nullable)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'title' AND is_nullable = 'YES') THEN
        ALTER TABLE "resumes" ALTER COLUMN "title" SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'source_type' AND is_nullable = 'YES') THEN
        ALTER TABLE "resumes" ALTER COLUMN "source_type" SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'status' AND is_nullable = 'YES') THEN
        ALTER TABLE "resumes" ALTER COLUMN "status" SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'is_default' AND is_nullable = 'YES') THEN
        ALTER TABLE "resumes" ALTER COLUMN "is_default" SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'is_public' AND is_nullable = 'YES') THEN
        ALTER TABLE "resumes" ALTER COLUMN "is_public" SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'created_at' AND is_nullable = 'YES') THEN
        ALTER TABLE "resumes" ALTER COLUMN "created_at" SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'recruitment' AND table_name = 'resumes' AND column_name = 'updated_at' AND is_nullable = 'YES') THEN
        ALTER TABLE "resumes" ALTER COLUMN "updated_at" SET NOT NULL;
        ALTER TABLE "resumes" ALTER COLUMN "updated_at" DROP DEFAULT;
    END IF;
END $$;

-- Step 4: Add constraints for data integrity (only if they don't exist)
DO $$
BEGIN
    -- Add check_resume_status constraint if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_resume_status' AND conrelid = 'recruitment.resumes'::regclass) THEN
        ALTER TABLE "resumes"
        ADD CONSTRAINT "check_resume_status"
        CHECK (status IN ('draft', 'active', 'archived'));
    END IF;

    -- Add check_file_size_limit constraint if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_file_size_limit' AND conrelid = 'recruitment.resumes'::regclass) THEN
        ALTER TABLE "resumes"
        ADD CONSTRAINT "check_file_size_limit"
        CHECK (file_size IS NULL OR file_size <= 5242880);
    END IF;

    -- Add check_created_cv_has_content constraint if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_created_cv_has_content' AND conrelid = 'recruitment.resumes'::regclass) THEN
        ALTER TABLE "resumes"
        ADD CONSTRAINT "check_created_cv_has_content"
        CHECK (
          (source_type = 'created' AND content IS NOT NULL)
          OR
          (source_type = 'uploaded' AND file_url IS NOT NULL AND file_size IS NOT NULL)
        );
    END IF;
END $$;

-- Step 5: Create unique index for default resume per profile (only if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "resumes_profile_id_is_default_unique"
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

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS "resumes_profile_id_is_default_idx" ON "resumes"("profile_id", "is_default");

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS "resumes_profile_id_status_idx" ON "resumes"("profile_id", "status");

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS "resumes_profile_id_source_type_idx" ON "resumes"("profile_id", "source_type");

-- RenameIndex (only if old index exists and new name doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'recruitment' AND indexname = 'idx_resumes_profile')
       AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'recruitment' AND indexname = 'resumes_profile_id_idx') THEN
        ALTER INDEX "idx_resumes_profile" RENAME TO "resumes_profile_id_idx";
    END IF;
END $$;
