-- CreateTable
CREATE TABLE "cost_breakdowns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "leadId" TEXT,
    "serviceTypeId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_breakdown_lines" (
    "id" TEXT NOT NULL,
    "costBreakdownId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_breakdown_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_breakdown_role_estimates" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_breakdown_role_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cost_breakdowns_tenantId_idx" ON "cost_breakdowns"("tenantId");

-- CreateIndex
CREATE INDEX "cost_breakdowns_projectId_idx" ON "cost_breakdowns"("projectId");

-- CreateIndex
CREATE INDEX "cost_breakdowns_leadId_idx" ON "cost_breakdowns"("leadId");

-- CreateIndex
CREATE INDEX "cost_breakdown_lines_costBreakdownId_idx" ON "cost_breakdown_lines"("costBreakdownId");

-- CreateIndex
CREATE INDEX "cost_breakdown_role_estimates_lineId_idx" ON "cost_breakdown_role_estimates"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_breakdown_role_estimates_lineId_role_key" ON "cost_breakdown_role_estimates"("lineId", "role");

-- AddForeignKey
ALTER TABLE "cost_breakdowns" ADD CONSTRAINT "cost_breakdowns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_breakdowns" ADD CONSTRAINT "cost_breakdowns_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_breakdowns" ADD CONSTRAINT "cost_breakdowns_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_breakdowns" ADD CONSTRAINT "cost_breakdowns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_breakdown_lines" ADD CONSTRAINT "cost_breakdown_lines_costBreakdownId_fkey" FOREIGN KEY ("costBreakdownId") REFERENCES "cost_breakdowns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_breakdown_lines" ADD CONSTRAINT "cost_breakdown_lines_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_breakdown_role_estimates" ADD CONSTRAINT "cost_breakdown_role_estimates_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "cost_breakdown_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
