-- DropForeignKey
ALTER TABLE "project_addenda" DROP CONSTRAINT "project_addenda_createdById_fkey";

-- DropForeignKey
ALTER TABLE "project_comments" DROP CONSTRAINT "project_comments_authorId_fkey";

-- DropForeignKey
ALTER TABLE "project_comments" DROP CONSTRAINT "project_comments_projectId_fkey";

-- DropForeignKey
ALTER TABLE "pto_requests" DROP CONSTRAINT "pto_requests_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "pto_requests" DROP CONSTRAINT "pto_requests_policyId_fkey";

-- DropForeignKey
ALTER TABLE "pto_requests" DROP CONSTRAINT "pto_requests_userId_fkey";

-- AlterTable
ALTER TABLE "cost_breakdowns" ADD COLUMN     "showDirectExpenses" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "indot_pay_zones" ALTER COLUMN "counties" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pay_grades" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_addenda" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_addendum_lines" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_comments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pto_policies" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pto_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "project_addenda" ADD CONSTRAINT "project_addenda_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pto_requests" ADD CONSTRAINT "pto_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pto_requests" ADD CONSTRAINT "pto_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pto_requests" ADD CONSTRAINT "pto_requests_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "pto_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
