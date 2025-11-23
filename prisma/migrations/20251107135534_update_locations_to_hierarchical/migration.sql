/*
  Warnings:

  - You are about to drop the column `city` on the `locations` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `locations` table. All the data in the column will be lost.
  - Added the required column `name` to the `locations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `locations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "location_type" AS ENUM ('province', 'district');

-- AlterTable
ALTER TABLE "locations" DROP COLUMN "city",
DROP COLUMN "country",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "parent_id" UUID,
ADD COLUMN     "type" "location_type" NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
