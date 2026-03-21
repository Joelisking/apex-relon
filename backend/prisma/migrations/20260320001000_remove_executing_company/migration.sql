-- AlterTable: Remove executingCompany from leads
ALTER TABLE "leads" DROP COLUMN IF EXISTS "executingCompany";

-- AlterTable: Remove executingCompany from projects
ALTER TABLE "projects" DROP COLUMN IF EXISTS "executingCompany";
