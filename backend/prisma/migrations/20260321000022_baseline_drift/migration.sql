-- AlterTable
ALTER TABLE "leads" DROP COLUMN "channel",
DROP COLUMN "position",
ADD COLUMN     "categoryIds" TEXT[],
ADD COLUMN     "county" TEXT,
ADD COLUMN     "serviceTypeIds" TEXT[];

-- AlterTable
ALTER TABLE "service_types" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "county" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "categoryIds" TEXT[],
ADD COLUMN     "county" TEXT,
ADD COLUMN     "serviceTypeIds" TEXT[];

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE INDEX "service_types_categoryId_idx" ON "service_types"("categoryId");

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

