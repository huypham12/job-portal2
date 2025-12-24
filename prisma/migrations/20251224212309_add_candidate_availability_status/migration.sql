-- CreateEnum
CREATE TYPE "availability_status" AS ENUM ('OPEN', 'PASSIVE', 'NOT_LOOKING');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "availability_status" "availability_status" DEFAULT 'OPEN';

-- Migrate existing data from is_looking_for_job to availability_status
UPDATE "profiles" SET "availability_status" = CASE
  WHEN "is_looking_for_job" = true THEN 'OPEN'::availability_status
  ELSE 'NOT_LOOKING'::availability_status
END;
