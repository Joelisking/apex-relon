-- Phase 5: Task CB/service item fields + Role.showInCostBreakdown
ALTER TABLE "tasks"
  ADD COLUMN "estimatedHours"       DOUBLE PRECISION,
  ADD COLUMN "costBreakdownLineId"  TEXT,
  ADD COLUMN "serviceItemId"        TEXT,
  ADD COLUMN "serviceItemSubtaskId" TEXT;

ALTER TABLE "roles"
  ADD COLUMN "showInCostBreakdown" BOOLEAN NOT NULL DEFAULT true;
