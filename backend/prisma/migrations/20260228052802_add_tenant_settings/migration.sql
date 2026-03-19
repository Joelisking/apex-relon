-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "clientDisplayMode" TEXT NOT NULL DEFAULT 'COMPANY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);
