-- CreateTable
CREATE TABLE "lead_team_members" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_team_members_leadId_idx" ON "lead_team_members"("leadId");

-- CreateIndex
CREATE INDEX "lead_team_members_userId_idx" ON "lead_team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_team_members_leadId_userId_key" ON "lead_team_members"("leadId", "userId");

-- AddForeignKey
ALTER TABLE "lead_team_members" ADD CONSTRAINT "lead_team_members_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_team_members" ADD CONSTRAINT "lead_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
