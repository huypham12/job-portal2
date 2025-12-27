/*
  Warnings:

  - You are about to drop the column `availability_status` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "availability_status";

-- DropEnum
DROP TYPE "availability_status";
