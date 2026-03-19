-- CreateTable
CREATE TABLE "quote_settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyWebsite" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'Q-',
    "defaultTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "defaultNotes" TEXT NOT NULL DEFAULT '',
    "defaultTerms" TEXT NOT NULL DEFAULT '',
    "accentColor" TEXT NOT NULL DEFAULT '#2563eb',
    "showTaxLine" BOOLEAN NOT NULL DEFAULT true,
    "showDiscountLine" BOOLEAN NOT NULL DEFAULT true,
    "showSignatureBlock" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_settings_pkey" PRIMARY KEY ("id")
);
