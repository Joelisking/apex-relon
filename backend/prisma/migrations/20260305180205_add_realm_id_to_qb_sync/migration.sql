-- AlterTable
ALTER TABLE "quickbooks_syncs" ADD COLUMN     "realmId" TEXT;

-- CreateIndex
CREATE INDEX "quickbooks_syncs_realmId_syncedAt_idx" ON "quickbooks_syncs"("realmId", "syncedAt");
