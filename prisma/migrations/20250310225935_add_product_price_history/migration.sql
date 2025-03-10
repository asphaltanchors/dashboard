-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cost" DECIMAL(10,2),
ADD COLUMN     "listPrice" DECIMAL(10,2),
ADD COLUMN     "unitsPerPackage" INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "listPrice" DECIMAL(10,2) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_idx" ON "ProductPriceHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_effectiveDate_idx" ON "ProductPriceHistory"("effectiveDate");

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
