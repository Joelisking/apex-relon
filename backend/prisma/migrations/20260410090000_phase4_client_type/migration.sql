-- Phase 4: Add clientType discriminator; make name nullable with default ""
ALTER TABLE "clients" ADD COLUMN "clientType" TEXT NOT NULL DEFAULT 'COMPANY';
ALTER TABLE "clients" ALTER COLUMN "name" SET DEFAULT '';
ALTER TABLE "clients" ALTER COLUMN "name" DROP NOT NULL;
