-- Phase 6: Addendum System
-- Creates project_addenda and project_addendum_lines tables

CREATE TABLE "project_addenda" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'DRAFT',
  "total"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "approvedAt"  TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_addenda_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_addendum_lines" (
  "id"             TEXT NOT NULL,
  "addendumId"     TEXT NOT NULL,
  "description"    TEXT NOT NULL,
  "role"           TEXT,
  "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "billableRate"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lineTotal"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_addendum_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_addenda_projectId_idx" ON "project_addenda"("projectId");
CREATE INDEX "project_addendum_lines_addendumId_idx" ON "project_addendum_lines"("addendumId");

ALTER TABLE "project_addenda"
  ADD CONSTRAINT "project_addenda_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_addenda"
  ADD CONSTRAINT "project_addenda_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "project_addendum_lines"
  ADD CONSTRAINT "project_addendum_lines_addendumId_fkey"
  FOREIGN KEY ("addendumId") REFERENCES "project_addenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
