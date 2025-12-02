/*
  Warnings:

  - Added the required column `title` to the `resumes` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `resumes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `resumes` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "resume_source" AS ENUM ('created', 'uploaded');

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "file_name" VARCHAR(255),
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mime_type" VARCHAR(100),
ADD COLUMN     "source_type" "resume_source" NOT NULL DEFAULT 'created',
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
ADD COLUMN     "title" VARCHAR(255) NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "resumes_profile_id_is_default_idx" ON "resumes"("profile_id", "is_default");

-- CreateIndex
CREATE INDEX "resumes_profile_id_status_idx" ON "resumes"("profile_id", "status");

-- CreateIndex
CREATE INDEX "resumes_profile_id_source_type_idx" ON "resumes"("profile_id", "source_type");

-- RenameIndex
ALTER INDEX "idx_resumes_profile" RENAME TO "resumes_profile_id_idx";
