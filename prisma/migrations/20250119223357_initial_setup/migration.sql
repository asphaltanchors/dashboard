-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('MAIN', 'CC');

-- CreateEnum
CREATE TYPE "PhoneType" AS ENUM ('MAIN', 'MOBILE', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderSourceType" AS ENUM ('INVOICE', 'SALES_RECEIPT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'CLOSED', 'VOID', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL', 'PENDING', 'FAILED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "quickbooksId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "companyDomain" TEXT,
    "billingAddressId" TEXT,
    "shippingAddressId" TEXT,
    "taxCode" TEXT,
    "taxItem" TEXT,
    "resaleNumber" TEXT,
    "creditLimit" DECIMAL(65,30),
    "terms" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "sourceData" JSONB NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "CustomerEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPhone" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" "PhoneType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "CustomerPhone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "line3" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT,
    "enriched" BOOLEAN NOT NULL DEFAULT false,
    "enrichedAt" TIMESTAMP(3),
    "enrichedSource" TEXT,
    "enrichmentData" JSONB,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "sourceType" "OrderSourceType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "billingAddressId" TEXT,
    "shippingAddressId" TEXT,
    "status" "OrderStatus" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "paymentMethod" TEXT,
    "paymentDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "terms" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL,
    "taxPercent" DECIMAL(65,30),
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "shipDate" TIMESTAMP(3),
    "shippingMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "sourceData" JSONB NOT NULL,
    "poNumber" TEXT,
    "quickbooksId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "serviceDate" TIMESTAMP(3),

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_quickbooksId_key" ON "Customer"("quickbooksId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_billingAddressId_key" ON "Customer"("billingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shippingAddressId_key" ON "Customer"("shippingAddressId");

-- CreateIndex
CREATE INDEX "Customer_customerName_idx" ON "Customer"("customerName");

-- CreateIndex
CREATE INDEX "Customer_companyDomain_idx" ON "Customer"("companyDomain");

-- CreateIndex
CREATE INDEX "CustomerEmail_email_idx" ON "CustomerEmail"("email");

-- CreateIndex
CREATE INDEX "CustomerEmail_customerId_idx" ON "CustomerEmail"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPhone_phone_idx" ON "CustomerPhone"("phone");

-- CreateIndex
CREATE INDEX "CustomerPhone_customerId_idx" ON "CustomerPhone"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_domain_key" ON "Company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_billingAddressId_key" ON "Order"("billingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shippingAddressId_key" ON "Order"("shippingAddressId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate");

-- CreateIndex
CREATE INDEX "Order_status_paymentStatus_idx" ON "Order"("status", "paymentStatus");

-- CreateIndex
CREATE INDEX "Order_quickbooksId_idx" ON "Order"("quickbooksId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productCode_idx" ON "OrderItem"("productCode");

-- CreateIndex
CREATE INDEX "OrderItem_serviceDate_idx" ON "OrderItem"("serviceDate");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyDomain_fkey" FOREIGN KEY ("companyDomain") REFERENCES "Company"("domain") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEmail" ADD CONSTRAINT "CustomerEmail_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPhone" ADD CONSTRAINT "CustomerPhone_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("productCode") ON DELETE RESTRICT ON UPDATE CASCADE;
