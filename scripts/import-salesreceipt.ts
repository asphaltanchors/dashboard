import { PrismaClient } from '@prisma/client';
import { ImportContext } from './shared/types';
import { OrderImportStats } from './shared/order-types';
import { createCsvParser, processImport, setupImportCommand } from './shared/utils';
import { SalesReceiptProcessor } from './processors/sales-receipt-processor';

const prisma = new PrismaClient();

async function importSalesReceipts(filePath: string, debug: boolean) {
  const stats: OrderImportStats = {
    processed: 0,
    ordersCreated: 0,
    ordersUpdated: 0,
    productsCreated: 0,
    productsUpdated: 0,
    addressesCreated: 0,
    warnings: [],
  };

  const ctx: ImportContext = {
    prisma,
    debug,
    stats,
  };

  const processor = new SalesReceiptProcessor(ctx);
  const parser = await createCsvParser(filePath);
  await processImport(ctx, parser, (row) => processor.processRow(row));

  // Log additional statistics
  console.log(`- Orders created: ${stats.ordersCreated}`);
  console.log(`- Orders updated: ${stats.ordersUpdated}`);
  console.log(`- Products created: ${stats.productsCreated}`);
  console.log(`- Products updated: ${stats.productsUpdated}`);
  console.log(`- Addresses created: ${stats.addressesCreated}`);
}

setupImportCommand(
  'import-salesreceipt',
  'Import sales receipt data from QuickBooks CSV export',
  importSalesReceipts
);
