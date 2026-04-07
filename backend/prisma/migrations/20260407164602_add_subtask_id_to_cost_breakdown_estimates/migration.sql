/*
  Warnings:

  - A unique constraint covering the columns `[lineId,subtaskId,role]` on the table `cost_breakdown_role_estimates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subtaskId` to the `cost_breakdown_role_estimates` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "cost_breakdown_role_estimates_lineId_role_key";

-- AlterTable
ALTER TABLE "cost_breakdown_role_estimates" ADD COLUMN     "subtaskId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cost_breakdown_role_estimates_lineId_subtaskId_role_key" ON "cost_breakdown_role_estimates"("lineId", "subtaskId", "role");

-- AddForeignKey
ALTER TABLE "cost_breakdown_role_estimates" ADD CONSTRAINT "cost_breakdown_role_estimates_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "service_item_subtasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
