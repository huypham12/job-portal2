/*
  Warnings:

  - You are about to drop the `job_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "job_tags" DROP CONSTRAINT "job_tags_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_tags" DROP CONSTRAINT "job_tags_tag_id_fkey";

-- DropTable
DROP TABLE "job_tags";

-- DropTable
DROP TABLE "tags";
