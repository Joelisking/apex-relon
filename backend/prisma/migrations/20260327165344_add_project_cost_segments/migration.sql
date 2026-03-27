-- AlterTable
ALTER TABLE "quote_settings" ALTER COLUMN "defaultValidityDays" SET DEFAULT 180;

-- CreateTable
CREATE TABLE "project_cost_segments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_cost_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_cost_segments_projectId_idx" ON "project_cost_segments"("projectId");

-- AddForeignKey
ALTER TABLE "project_cost_segments" ADD CONSTRAINT "project_cost_segments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
