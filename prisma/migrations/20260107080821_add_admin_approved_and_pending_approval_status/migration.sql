-- AlterEnum
ALTER TYPE "job_status" ADD VALUE 'pending_approval';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "admin_approved" BOOLEAN DEFAULT false;
