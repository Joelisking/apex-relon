-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "workCodeId" TEXT;

-- CreateTable
CREATE TABLE "work_codes" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "division" INTEGER NOT NULL,
    "parentCode" INTEGER,
    "isMainTask" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_codes_code_key" ON "work_codes"("code");

-- CreateIndex
CREATE INDEX "work_codes_division_idx" ON "work_codes"("division");

-- CreateIndex
CREATE INDEX "work_codes_parentCode_idx" ON "work_codes"("parentCode");

-- CreateIndex
CREATE INDEX "time_entries_workCodeId_idx" ON "time_entries"("workCodeId");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_workCodeId_fkey" FOREIGN KEY ("workCodeId") REFERENCES "work_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
