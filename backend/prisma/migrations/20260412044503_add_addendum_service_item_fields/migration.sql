-- AlterTable
ALTER TABLE "project_addenda" ADD COLUMN     "roleDisplayNames" JSONB;

-- AlterTable
ALTER TABLE "project_addendum_lines" ADD COLUMN     "serviceItemId" TEXT,
ADD COLUMN     "serviceItemSubtaskId" TEXT;

-- AddForeignKey
ALTER TABLE "project_addendum_lines" ADD CONSTRAINT "project_addendum_lines_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_addendum_lines" ADD CONSTRAINT "project_addendum_lines_serviceItemSubtaskId_fkey" FOREIGN KEY ("serviceItemSubtaskId") REFERENCES "service_item_subtasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
