/*
  Warnings:

  - You are about to drop the column `metadata` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "companies" DROP COLUMN "metadata",
ADD COLUMN     "business_license" VARCHAR(100),
ADD COLUMN     "contact_address" TEXT,
ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(20),
ADD COLUMN     "facebook_url" VARCHAR(255),
ADD COLUMN     "is_verified" BOOLEAN DEFAULT false,
ADD COLUMN     "linkedin_url" VARCHAR(255),
ADD COLUMN     "status" VARCHAR(20) DEFAULT 'active',
ADD COLUMN     "tax_code" VARCHAR(50),
ADD COLUMN     "twitter_url" VARCHAR(255),
ADD COLUMN     "verification_date" TIMESTAMP(6);
