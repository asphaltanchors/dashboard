/*
  Warnings:

  - You are about to drop the column `sourceType` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "sourceType";

-- DropEnum
DROP TYPE "OrderSourceType";
