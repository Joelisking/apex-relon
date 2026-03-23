-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "bottleneckCriticalStageDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "bottleneckStuckDays" INTEGER NOT NULL DEFAULT 14;
