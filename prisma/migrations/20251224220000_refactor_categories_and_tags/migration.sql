-- Create CategoryType enum (drop if exists first)
DROP TYPE IF EXISTS "CategoryType" CASCADE;
CREATE TYPE "CategoryType" AS ENUM ('industry', 'technical', 'work_type');

-- Create categories table
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" "CategoryType" NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes for categories
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "idx_categories_type" ON "categories"("type");

-- Add category_id column to skills (nullable first)
ALTER TABLE "skills" ADD COLUMN "category_id" UUID;

-- Create index for skills category_id
CREATE INDEX "idx_skills_category" ON "skills"("category_id");

-- Create job_categories table
CREATE TABLE "job_categories" (
    "job_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("job_id","category_id")
);

-- Create indexes for job_categories
CREATE INDEX "idx_job_categories_job" ON "job_categories"("job_id");
CREATE INDEX "idx_job_categories_category" ON "job_categories"("category_id");

-- Add foreign key constraints (after data migration)
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Drop old constraints and columns (after data migration)
ALTER TABLE "skills" DROP CONSTRAINT IF EXISTS "skills_category_check";
ALTER TABLE "skills" DROP COLUMN IF EXISTS "category";
DROP TABLE IF EXISTS "job_tags" CASCADE;
DROP TABLE IF EXISTS "tags" CASCADE;
