-- AlterTable
ALTER TABLE "cost_breakdown_lines" ADD COLUMN     "excludedSubtaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
