/*
  Warnings:

  - You are about to drop the `company_cultures` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "company_cultures" DROP CONSTRAINT "company_cultures_company_id_fkey";

-- AlterTable
ALTER TABLE "company_details" ADD COLUMN     "culture_description" TEXT;

-- DropTable
DROP TABLE "company_cultures";
