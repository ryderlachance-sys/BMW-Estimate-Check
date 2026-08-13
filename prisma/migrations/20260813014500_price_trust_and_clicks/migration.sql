ALTER TABLE "EstimateItem"
  ADD COLUMN "retailerCheckedAt" TIMESTAMP(3),
  ADD COLUMN "fitmentNote" TEXT;

ALTER TABLE "CatalogPart" ADD COLUMN "retailerCheckedAt" TIMESTAMP(3);

CREATE TABLE "OutboundClick" (
  "id" TEXT NOT NULL,
  "retailer" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "partName" TEXT,
  "vehicle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboundClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboundClick_createdAt_idx" ON "OutboundClick"("createdAt");
CREATE INDEX "OutboundClick_retailer_idx" ON "OutboundClick"("retailer");
