/*
  Warnings:

  - A unique constraint covering the columns `[recruiter_id]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "companies_recruiter_id_key" ON "companies"("recruiter_id");
