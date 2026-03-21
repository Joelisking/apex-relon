-- AlterTable: Add soft delete fields to clients
ALTER TABLE "clients" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN "deletedAt" TIMESTAMP(3);
