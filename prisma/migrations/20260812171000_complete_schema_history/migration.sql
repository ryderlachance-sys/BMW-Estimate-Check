-- Fields and fulfillment tables added after the original migrations.
-- Keeping these in migration history makes clean and Vercel deployments match
-- the Prisma schema instead of relying on an out-of-band `prisma db push`.

ALTER TABLE "Vehicle" ALTER COLUMN "make" SET DEFAULT 'Unknown';

ALTER TABLE "EstimateItem"
  ADD COLUMN "amazonAsin" TEXT,
  ADD COLUMN "ebayItemId" TEXT;

ALTER TABLE "CatalogPart"
  ADD COLUMN "compatibleMakes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "amazonAsin" TEXT,
  ADD COLUMN "ebayItemId" TEXT;

CREATE TYPE "FulfillmentStatus" AS ENUM (
  'PENDING',
  'PROCURING',
  'ORDERED_FROM_SUPPLIER',
  'SHIPPED',
  'FAILED'
);

CREATE TABLE "FulfillmentJob" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "externalRef" TEXT,
  "lastError" TEXT,
  "procurementNotes" TEXT,
  "procuredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FulfillmentJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcurementLine" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "catalogPartId" TEXT NOT NULL,
  "oemNumber" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "buyUrl" TEXT,
  "supplierStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "supplierOrderId" TEXT,
  "trackingNumber" TEXT,
  CONSTRAINT "ProcurementLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FulfillmentJob_orderId_key" ON "FulfillmentJob"("orderId");
CREATE INDEX "ProcurementLine_jobId_idx" ON "ProcurementLine"("jobId");

ALTER TABLE "FulfillmentJob"
  ADD CONSTRAINT "FulfillmentJob_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProcurementLine"
  ADD CONSTRAINT "ProcurementLine_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "FulfillmentJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
