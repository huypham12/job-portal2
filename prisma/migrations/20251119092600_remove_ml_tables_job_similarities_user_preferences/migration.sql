/*
  Warnings:

  - You are about to drop the `job_similarities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_preferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- Drop dependent materialized view first
DROP MATERIALIZED VIEW IF EXISTS "recruitment"."mv_report_user_preferences" CASCADE;

-- DropForeignKey
ALTER TABLE "recruitment"."job_similarities" DROP CONSTRAINT "job_similarities_job1_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."job_similarities" DROP CONSTRAINT "job_similarities_job2_id_fkey";

-- DropForeignKey
ALTER TABLE "recruitment"."user_preferences" DROP CONSTRAINT "user_preferences_user_id_fkey";

-- DropTable
DROP TABLE "recruitment"."job_similarities";

-- DropTable
DROP TABLE "recruitment"."user_preferences";
