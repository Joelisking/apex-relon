-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "canAssignBuiltIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "submittedById" TEXT;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
