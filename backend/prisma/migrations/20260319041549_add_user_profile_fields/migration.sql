-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustCompleteProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT;
