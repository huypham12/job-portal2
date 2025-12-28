/*
  Warnings:

  - You are about to alter the column `name` on the `skills` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - Changed the type of `type` on the `categories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `category_id` on table `skills` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('industry', 'technical', 'work_type');

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "type",
ADD COLUMN     "type" "category_type" NOT NULL;

-- AlterTable
ALTER TABLE "skills" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "category_id" SET NOT NULL;

-- DropEnum
DROP TYPE "CategoryType";

-- CreateIndex
CREATE INDEX "idx_categories_type" ON "categories"("type");
