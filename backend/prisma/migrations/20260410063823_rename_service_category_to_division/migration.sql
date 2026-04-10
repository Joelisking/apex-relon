-- Data-safe rename migration: uses RENAME COLUMN to preserve existing data.
-- Prisma generated DROP+ADD (which loses data). We override with RENAME COLUMN.

-- DropForeignKey
ALTER TABLE "cost_breakdowns" DROP CONSTRAINT "cost_breakdowns_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "proposal_templates" DROP CONSTRAINT "proposal_templates_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "service_types" DROP CONSTRAINT "service_types_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "task_types" DROP CONSTRAINT "task_types_serviceTypeId_fkey";

-- DropIndex
DROP INDEX "leads_serviceTypeId_idx";

-- DropIndex
DROP INDEX "pipeline_stages_name_pipelineType_serviceType_key";

-- DropIndex
DROP INDEX "pipeline_stages_pipelineType_serviceType_idx";

-- DropIndex
DROP INDEX "projects_serviceTypeId_idx";

-- DropIndex
DROP INDEX "service_types_categoryId_idx";

-- DropIndex
DROP INDEX "task_types_serviceTypeId_idx";

-- RenameColumn (preserves data — replaces Prisma's DROP+ADD)
ALTER TABLE "cost_breakdowns" RENAME COLUMN "serviceTypeId" TO "service_type_id";
ALTER TABLE "leads" RENAME COLUMN "serviceTypeId" TO "service_type_id";
ALTER TABLE "leads" RENAME COLUMN "serviceTypeIds" TO "service_type_ids";
ALTER TABLE "pipeline_stages" RENAME COLUMN "serviceType" TO "service_type";
ALTER TABLE "projects" RENAME COLUMN "serviceTypeId" TO "service_type_id";
ALTER TABLE "projects" RENAME COLUMN "serviceTypeIds" TO "service_type_ids";
ALTER TABLE "proposal_templates" RENAME COLUMN "serviceTypeId" TO "service_type_id";
ALTER TABLE "service_items" RENAME COLUMN "serviceTypeIds" TO "service_type_ids";
ALTER TABLE "service_types" RENAME COLUMN "categoryId" TO "category_id";
ALTER TABLE "task_types" RENAME COLUMN "serviceTypeId" TO "service_type_id";

-- CreateIndex
CREATE INDEX "leads_service_type_id_idx" ON "leads"("service_type_id");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipelineType_service_type_idx" ON "pipeline_stages"("pipelineType", "service_type");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_name_pipelineType_service_type_key" ON "pipeline_stages"("name", "pipelineType", "service_type");

-- CreateIndex
CREATE INDEX "projects_service_type_id_idx" ON "projects"("service_type_id");

-- CreateIndex
CREATE INDEX "service_types_category_id_idx" ON "service_types"("category_id");

-- CreateIndex
CREATE INDEX "task_types_service_type_id_idx" ON "task_types"("service_type_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_templates" ADD CONSTRAINT "proposal_templates_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_breakdowns" ADD CONSTRAINT "cost_breakdowns_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
