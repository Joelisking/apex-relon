-- CreateTable: indot_pay_zones
CREATE TABLE "indot_pay_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payGradeId" TEXT NOT NULL,
    "counties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indot_pay_zones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "indot_pay_zones_name_key" ON "indot_pay_zones"("name");
CREATE INDEX "indot_pay_zones_payGradeId_idx" ON "indot_pay_zones"("payGradeId");

ALTER TABLE "indot_pay_zones" ADD CONSTRAINT "indot_pay_zones_payGradeId_fkey"
  FOREIGN KEY ("payGradeId") REFERENCES "pay_grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
