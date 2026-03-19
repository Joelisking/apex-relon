-- CreateTable
CREATE TABLE "lead_forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "targetStage" TEXT NOT NULL,
    "assignToUserId" TEXT,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "submissionsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_form_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "leadId" TEXT,
    "data" JSONB NOT NULL,
    "ipAddress" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_forms_apiKey_key" ON "lead_forms"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "lead_form_submissions_leadId_key" ON "lead_form_submissions"("leadId");

-- CreateIndex
CREATE INDEX "lead_form_submissions_formId_idx" ON "lead_form_submissions"("formId");

-- CreateIndex
CREATE INDEX "lead_form_submissions_submittedAt_idx" ON "lead_form_submissions"("submittedAt");

-- AddForeignKey
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_assignToUserId_fkey" FOREIGN KEY ("assignToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_form_submissions" ADD CONSTRAINT "lead_form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_form_submissions" ADD CONSTRAINT "lead_form_submissions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
