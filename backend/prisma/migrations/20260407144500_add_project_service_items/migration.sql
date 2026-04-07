-- CreateTable
CREATE TABLE "project_service_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_service_items_projectId_idx" ON "project_service_items"("projectId");

-- CreateIndex
CREATE INDEX "project_service_items_serviceItemId_idx" ON "project_service_items"("serviceItemId");

-- AddForeignKey
ALTER TABLE "project_service_items" ADD CONSTRAINT "project_service_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_service_items" ADD CONSTRAINT "project_service_items_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
