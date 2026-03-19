-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "taskDue" BOOLEAN NOT NULL DEFAULT true,
    "taskOverdue" BOOLEAN NOT NULL DEFAULT true,
    "leadStale" BOOLEAN NOT NULL DEFAULT true,
    "leadStageChanged" BOOLEAN NOT NULL DEFAULT true,
    "projectAtRisk" BOOLEAN NOT NULL DEFAULT true,
    "clientDormant" BOOLEAN NOT NULL DEFAULT true,
    "emailDigest" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
