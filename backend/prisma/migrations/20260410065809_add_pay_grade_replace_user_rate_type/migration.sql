-- CreateTable: pay_grades
CREATE TABLE "pay_grades" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pay_grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pay_grades_code_key" ON "pay_grades"("code");

-- Seed initial pay grades (5 grades: Base, Billing, INDOT 1/2/3)
INSERT INTO "pay_grades" ("id", "name", "code", "description", "sortOrder", "isDefault", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Base Rate',    'base',    'Standard labor rate for all non-INDOT work', 0, true,  true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Billing',      'billing', 'Billable rate charged to clients',           1, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'INDOT Pay 1',  'indot_1', 'INDOT Pay Grade 1',                         2, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'INDOT Pay 2',  'indot_2', 'INDOT Pay Grade 2',                         3, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'INDOT Pay 3',  'indot_3', 'INDOT Pay Grade 3',                         4, false, true, NOW(), NOW());

-- Add payGradeId as nullable first so existing rows aren't blocked
ALTER TABLE "user_rates" ADD COLUMN "payGradeId" TEXT;

-- Migrate existing rows: "internal" → Base Rate, "billing" → Billing, anything else → Base Rate
UPDATE "user_rates" ur
SET "payGradeId" = pg.id
FROM "pay_grades" pg
WHERE pg.code = 'base'
  AND ur.type IN ('internal', 'base');

UPDATE "user_rates" ur
SET "payGradeId" = pg.id
FROM "pay_grades" pg
WHERE pg.code = 'billing'
  AND ur.type = 'billing';

-- Fallback: any row still NULL (unknown type) → Base Rate
UPDATE "user_rates"
SET "payGradeId" = (SELECT id FROM "pay_grades" WHERE code = 'base' LIMIT 1)
WHERE "payGradeId" IS NULL;

-- Now safe to make NOT NULL
ALTER TABLE "user_rates" ALTER COLUMN "payGradeId" SET NOT NULL;

-- Drop the old type column
ALTER TABLE "user_rates" DROP COLUMN "type";

-- CreateIndex
CREATE INDEX "user_rates_payGradeId_idx" ON "user_rates"("payGradeId");

-- AddForeignKey
ALTER TABLE "user_rates" ADD CONSTRAINT "user_rates_payGradeId_fkey" FOREIGN KEY ("payGradeId") REFERENCES "pay_grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
