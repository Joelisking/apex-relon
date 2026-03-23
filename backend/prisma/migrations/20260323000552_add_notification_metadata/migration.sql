/*
  Warnings:

  - You are about to drop the column `designerId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `qsId` on the `projects` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_designerId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_qsId_fkey";

-- DropIndex
DROP INDEX "projects_designerId_idx";

-- DropIndex
DROP INDEX "projects_qsId_idx";

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "designerId",
DROP COLUMN "qsId";

-- CreateIndex
CREATE INDEX "projects_projectManagerId_idx" ON "projects"("projectManagerId");
