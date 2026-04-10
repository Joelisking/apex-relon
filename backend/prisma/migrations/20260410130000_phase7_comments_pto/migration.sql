-- Phase 7: Project comments and PTO system

-- Notification preference flags
ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "commentMention" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "ptoUpdate"      BOOLEAN NOT NULL DEFAULT true;

-- Project comments
CREATE TABLE "project_comments" (
  "id"           TEXT NOT NULL,
  "projectId"    TEXT NOT NULL,
  "authorId"     TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "mentionedIds" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_comments_projectId_idx" ON "project_comments"("projectId");
ALTER TABLE "project_comments"
  ADD CONSTRAINT "project_comments_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "project_comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id");

-- PTO policies
CREATE TABLE "pto_policies" (
  "id"               TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "maxDaysPerYear"   DOUBLE PRECISION NOT NULL,
  "accrualType"      TEXT NOT NULL DEFAULT 'ANNUAL',
  "carryoverMax"     DOUBLE PRECISION,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pto_policies_pkey" PRIMARY KEY ("id")
);

-- PTO requests
CREATE TABLE "pto_requests" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "policyId"     TEXT,
  "type"         TEXT NOT NULL,
  "startDate"    TIMESTAMP(3) NOT NULL,
  "endDate"      TIMESTAMP(3) NOT NULL,
  "hours"        DOUBLE PRECISION NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "notes"        TEXT,
  "approvedById" TEXT,
  "approvedAt"   TIMESTAMP(3),
  "deniedReason" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pto_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pto_requests_userId_idx"  ON "pto_requests"("userId");
CREATE INDEX "pto_requests_status_idx"  ON "pto_requests"("status");
ALTER TABLE "pto_requests"
  ADD CONSTRAINT "pto_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id"),
  ADD CONSTRAINT "pto_requests_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id"),
  ADD CONSTRAINT "pto_requests_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "pto_policies"("id") ON DELETE SET NULL;
