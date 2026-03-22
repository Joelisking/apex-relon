/*
  Warnings:

  - A unique constraint covering the columns `[jobNumber]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "jobNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_jobNumber_key" ON "projects"("jobNumber");
