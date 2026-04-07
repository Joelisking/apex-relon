-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "proposalTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposalTemplateId_fkey" FOREIGN KEY ("proposalTemplateId") REFERENCES "proposal_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
