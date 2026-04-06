/*
  Warnings:

  - You are about to drop the column `serviceTypeId` on the `service_items` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "service_items" DROP CONSTRAINT "service_items_serviceTypeId_fkey";

-- DropIndex
DROP INDEX "service_items_serviceTypeId_idx";

-- AlterTable
ALTER TABLE "service_items" DROP COLUMN "serviceTypeId",
ADD COLUMN     "serviceTypeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
