-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "serviceTypeId" TEXT;

-- AlterTable
ALTER TABLE "quote_line_items" ADD COLUMN     "serviceItemId" TEXT;

-- AlterTable
ALTER TABLE "service_types" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "taskTypeId" TEXT;

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "serviceItemId" TEXT,
ADD COLUMN     "serviceItemSubtaskId" TEXT;

-- CreateTable
CREATE TABLE "task_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceTypeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceTypeId" TEXT,
    "unit" TEXT,
    "defaultPrice" DOUBLE PRECISION,
    "qbItemId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_item_subtasks" (
    "id" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_item_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_item_role_estimates" (
    "id" TEXT NOT NULL,
    "subtaskId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_item_role_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_types_name_key" ON "task_types"("name");

-- CreateIndex
CREATE INDEX "task_types_serviceTypeId_idx" ON "task_types"("serviceTypeId");

-- CreateIndex
CREATE INDEX "service_items_serviceTypeId_idx" ON "service_items"("serviceTypeId");

-- CreateIndex
CREATE INDEX "service_items_isActive_idx" ON "service_items"("isActive");

-- CreateIndex
CREATE INDEX "service_item_subtasks_serviceItemId_idx" ON "service_item_subtasks"("serviceItemId");

-- CreateIndex
CREATE INDEX "service_item_role_estimates_subtaskId_idx" ON "service_item_role_estimates"("subtaskId");

-- CreateIndex
CREATE UNIQUE INDEX "service_item_role_estimates_subtaskId_role_key" ON "service_item_role_estimates"("subtaskId", "role");

-- CreateIndex
CREATE INDEX "projects_serviceTypeId_idx" ON "projects"("serviceTypeId");

-- CreateIndex
CREATE INDEX "tasks_taskTypeId_idx" ON "tasks"("taskTypeId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_serviceItemSubtaskId_fkey" FOREIGN KEY ("serviceItemSubtaskId") REFERENCES "service_item_subtasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_item_subtasks" ADD CONSTRAINT "service_item_subtasks_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "service_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_item_role_estimates" ADD CONSTRAINT "service_item_role_estimates_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "service_item_subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
