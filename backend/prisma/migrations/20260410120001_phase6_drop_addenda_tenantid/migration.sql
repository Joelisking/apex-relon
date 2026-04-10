-- Drop tenantId from project_addenda (not needed; scoped via project)
ALTER TABLE "project_addenda" DROP COLUMN IF EXISTS "tenantId";
