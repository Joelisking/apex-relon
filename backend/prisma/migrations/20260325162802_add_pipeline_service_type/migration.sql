/*
  Warnings:

  - A unique constraint covering the columns `[name,pipelineType,serviceType]` on the table `pipeline_stages` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "pipeline_stages_name_pipelineType_key";

-- AlterTable
ALTER TABLE "pipeline_stages" ADD COLUMN     "serviceType" TEXT NOT NULL DEFAULT '__all__';

-- CreateIndex
CREATE INDEX "pipeline_stages_pipelineType_serviceType_idx" ON "pipeline_stages"("pipelineType", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_name_pipelineType_serviceType_key" ON "pipeline_stages"("name", "pipelineType", "serviceType");
