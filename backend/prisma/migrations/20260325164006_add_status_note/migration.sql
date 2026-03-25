-- AlterTable
ALTER TABLE "project_status_history" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "statusNote" TEXT;
