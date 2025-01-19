-- DropIndex
DROP INDEX "Customer_billingAddressId_key";

-- DropIndex
DROP INDEX "Customer_shippingAddressId_key";

-- DropIndex
DROP INDEX "Order_billingAddressId_key";

-- DropIndex
DROP INDEX "Order_shippingAddressId_key";

-- CreateIndex
CREATE INDEX "Customer_billingAddressId_idx" ON "Customer"("billingAddressId");

-- CreateIndex
CREATE INDEX "Customer_shippingAddressId_idx" ON "Customer"("shippingAddressId");

-- CreateIndex
CREATE INDEX "Order_billingAddressId_idx" ON "Order"("billingAddressId");

-- CreateIndex
CREATE INDEX "Order_shippingAddressId_idx" ON "Order"("shippingAddressId");
