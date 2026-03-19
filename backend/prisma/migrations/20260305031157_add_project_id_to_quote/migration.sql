-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE INDEX "quotes_projectId_idx" ON "quotes"("projectId");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
