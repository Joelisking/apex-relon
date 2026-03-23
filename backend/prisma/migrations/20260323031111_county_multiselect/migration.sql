/*
  Warnings:

  - The `county` column on the `leads` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `county` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "county",
ADD COLUMN     "county" TEXT[];

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "county",
ADD COLUMN     "county" TEXT[];
