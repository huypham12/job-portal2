/*
  Warnings:

  - You are about to drop the column `metadata` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the `user_skills` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `full_name` to the `profiles` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "recruitment"."profiles" DROP CONSTRAINT "profiles_location_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."profiles" DROP CONSTRAINT "profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."user_skills" DROP CONSTRAINT "user_skills_skill_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."user_skills" DROP CONSTRAINT "user_skills_user_id_fkey";

-- DropIndex
DROP INDEX "recruitment"."gin_profiles_metadata";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "metadata",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "desired_currency" VARCHAR(10) DEFAULT 'VND',
ADD COLUMN     "desired_job_title" VARCHAR(255),
ADD COLUMN     "desired_job_type" "job_type"[] DEFAULT ARRAY[]::"job_type"[],
ADD COLUMN     "desired_salary_min" INTEGER,
ADD COLUMN     "display_name" VARCHAR(255),
ADD COLUMN     "full_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "gender" VARCHAR(20),
ADD COLUMN     "github_url" VARCHAR(255),
ADD COLUMN     "headline" VARCHAR(255),
ADD COLUMN     "is_looking_for_job" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "linkedin_url" VARCHAR(255),
ADD COLUMN     "location_text" VARCHAR(100),
ADD COLUMN     "personal_website" VARCHAR(255),
ADD COLUMN     "phone_number" VARCHAR(20),
ADD COLUMN     "years_of_experience" INTEGER DEFAULT 0,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "recruitment"."user_skills";

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

-- CreateIndex
CREATE INDEX "profile_experiences_profile_id_idx" ON "profile_experiences"("profile_id");

-- CreateIndex
CREATE INDEX "profile_educations_profile_id_idx" ON "profile_educations"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_is_looking_for_job_idx" ON "profiles"("is_looking_for_job");

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

-- RenameIndex
ALTER INDEX "idx_profiles_user" RENAME TO "profiles_user_id_idx";
