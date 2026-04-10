-- Phase 2: Financial source-of-truth fields
-- Add invoicedValue to projects (set at proposal acceptance)
ALTER TABLE "projects" ADD COLUMN "invoicedValue" DOUBLE PRECISION;

-- Add primaryCostBreakdownId to projects (pointer to the active CB)
ALTER TABLE "projects" ADD COLUMN "primaryCostBreakdownId" TEXT;
CREATE UNIQUE INDEX "projects_primaryCostBreakdownId_key" ON "projects"("primaryCostBreakdownId");
ALTER TABLE "projects" ADD CONSTRAINT "projects_primaryCostBreakdownId_fkey"
  FOREIGN KEY ("primaryCostBreakdownId") REFERENCES "cost_breakdowns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add benchmarkLockedAt to cost_breakdowns (set when proposal is accepted)
ALTER TABLE "cost_breakdowns" ADD COLUMN "benchmarkLockedAt" TIMESTAMP(3);
