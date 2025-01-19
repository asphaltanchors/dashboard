import { PrismaClient, OrderSourceType, OrderStatus, PaymentStatus } from '@prisma/client';
import { BaseImportStats, ImportContext } from './shared/types';
import { 
  createCsvParser, 
  parseDate, 
  parseDecimal,
  processAddress, 
  processImport, 
  setupImportCommand 
} from './shared/utils';

const prisma = new PrismaClient();

interface OrderItemData {
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  serviceDate?: Date | null;
}

interface SalesReceiptImportStats extends BaseImportStats {
  ordersCreated: number;
  ordersUpdated: number;
  productsCreated: number;
  productsUpdated: number;
  addressesCreated: number;
}

interface SalesReceiptRow {
  'QuickBooks Internal Id': string;
  'Sales Receipt No': string;
  'Customer': string;
  'Sales Receipt Date': string;
  'Payment Method': string;
  'Product/Service': string;
  'Product/Service Description': string;
  'Product/Service Quantity': string;
  'Product/Service Rate': string;
  'Product/Service Amount': string;
  'Product/Service Service Date': string;
  'Due Date': string;
  'Ship Date': string;
  'Shipping Method': string;
  'Total Tax': string;
  'Total Amount': string;
  'Created Date': string;
  'Modified Date': string;
  'Billing Address Line 1': string;
  'Billing Address Line 2': string;
  'Billing Address Line 3': string;
  'Billing Address City': string;
  'Billing Address State': string;
  'Billing Address Postal Code': string;
  'Billing Address Country': string;
  'Shipping Address Line 1': string;
  'Shipping Address Line 2': string;
  'Shipping Address Line 3': string;
  'Shipping Address City': string;
  'Shipping Address State': string;
  'Shipping Address Postal Code': string;
  'Shipping Address Country': string;
  [key: string]: string;
}

async function processOrderItems(ctx: ImportContext, orderId: string, items: OrderItemData[]) {
  const stats = ctx.stats as SalesReceiptImportStats;

  // Delete any existing items for this order
  await ctx.prisma.orderItem.deleteMany({
    where: { orderId }
  });

  // Create new items
  for (const item of items) {
    // Check if product exists first
    const existingProduct = await ctx.prisma.product.findUnique({
      where: { productCode: item.productCode }
    });

    // Create or update product
    const product = await ctx.prisma.product.upsert({
      where: { productCode: item.productCode },
      update: {
        name: item.description || item.productCode,
        description: item.description,
        modifiedAt: new Date()
      },
      create: {
        productCode: item.productCode,
        name: item.description || item.productCode,
        description: item.description,
        createdAt: new Date(),
        modifiedAt: new Date()
      }
    });

    if (existingProduct) {
      stats.productsUpdated++;
      if (ctx.debug) {
        console.log(`Updated product: ${product.productCode} (${product.name})`);
      }
    } else {
      stats.productsCreated++;
      if (ctx.debug) {
        console.log(`Created product: ${product.productCode} (${product.name})`);
      }
    }

    await ctx.prisma.orderItem.create({
      data: {
        orderId,
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        serviceDate: item.serviceDate,
      }
    });

    if (ctx.debug) {
      console.log(`Created order item: ${item.productCode} (${item.quantity} @ ${item.unitPrice})`);
    }
  }
}

async function findOrCreateCustomer(ctx: ImportContext, customerName: string): Promise<string> {
  // Look for existing customer
  const existingCustomer = await ctx.prisma.customer.findFirst({
    where: { customerName }
  });

  if (existingCustomer) {
    if (ctx.debug) console.log(`Found existing customer: ${customerName}`);
    return existingCustomer.id;
  }

  // Create new customer
  const newCustomer = await ctx.prisma.customer.create({
    data: {
      quickbooksId: `IMPORT-${Date.now()}`, // Generate a unique ID
      customerName,
      status: 'ACTIVE',
      createdAt: new Date(),
      modifiedAt: new Date(),
      sourceData: { importedName: customerName }
    }
  });

  if (ctx.debug) console.log(`Created new customer: ${customerName}`);
  return newCustomer.id;
}

async function processSalesReceiptRow(ctx: ImportContext, row: SalesReceiptRow) {
  const stats = ctx.stats as SalesReceiptImportStats;
  const quickbooksId = row['QuickBooks Internal Id'];
  const customerName = row['Customer'];

  if (!quickbooksId) {
    stats.warnings.push(`Skipping row: Missing QuickBooks ID`);
    return;
  }

  if (!customerName) {
    stats.warnings.push(`Skipping row: Missing Customer Name`);
    return;
  }

  // Skip tax and shipping line items
  if (row['Product/Service'] === 'NJ Sales Tax' || 
      row['Product/Service'] === 'Shipping' ||
      row['Product/Service'] === 'Discount') {
    return;
  }

  // Create line item if product code exists
  let lineItems: OrderItemData[] = [];
  if (row['Product/Service']) {
    lineItems.push({
      productCode: row['Product/Service'],
      description: row['Product/Service Description'],
      quantity: parseFloat(row['Product/Service Quantity'] || '0'),
      unitPrice: parseFloat(row['Product/Service Rate'] || '0'),
      amount: parseFloat(row['Product/Service Amount'] || '0'),
      serviceDate: parseDate(row['Product/Service Service Date'])
    });
  }

  // Process addresses
  const billingAddress = await processAddress(ctx, {
    line1: row['Billing Address Line 1'],
    line2: row['Billing Address Line 2'],
    line3: row['Billing Address Line 3'],
    city: row['Billing Address City'],
    state: row['Billing Address State'],
    postalCode: row['Billing Address Postal Code'],
    country: row['Billing Address Country'],
  });

  const shippingAddress = await processAddress(ctx, {
    line1: row['Shipping Address Line 1'],
    line2: row['Shipping Address Line 2'],
    line3: row['Shipping Address Line 3'],
    city: row['Shipping Address City'],
    state: row['Shipping Address State'],
    postalCode: row['Shipping Address Postal Code'],
    country: row['Shipping Address Country'],
  });

  // Parse dates
  const orderDate = parseDate(row['Sales Receipt Date']) || new Date();
  const dueDate = parseDate(row['Due Date']);
  const createdDate = parseDate(row['Created Date']) || new Date();
  const modifiedDate = parseDate(row['Modified Date']) || new Date();
  const shipDate = parseDate(row['Ship Date']);

  // Parse amounts
  const taxAmount = parseDecimal(row['Total Tax']);
  const totalAmount = parseDecimal(row['Total Amount']);

  // Create or update order
  const existingOrder = await ctx.prisma.order.findFirst({
    where: { quickbooksId }
  });

  // Find or create customer
  const customerId = await findOrCreateCustomer(ctx, customerName);

  const orderData = {
    orderNumber: row['Sales Receipt No'],
    orderDate,
    sourceType: OrderSourceType.SALES_RECEIPT,
    customerId,
    billingAddressId: billingAddress?.id,
    shippingAddressId: shippingAddress?.id,
    status: OrderStatus.CLOSED, // Sales receipts are always closed/paid
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: row['Payment Method'] || null,
    paymentDate: orderDate, // Sales receipts are paid at time of sale
    dueDate,
    terms: null,
    subtotal: totalAmount - taxAmount,
    taxAmount,
    taxPercent: taxAmount > 0 ? (taxAmount / (totalAmount - taxAmount)) * 100 : 0,
    totalAmount,
    shipDate,
    shippingMethod: row['Shipping Method'] || null,
    modifiedAt: modifiedDate,
    quickbooksId,
    sourceData: row,
  };

  let order;
  if (existingOrder) {
    order = await ctx.prisma.order.update({
      where: { id: existingOrder.id },
      data: orderData,
    });
    if (ctx.debug) console.log(`Updated order: ${order.orderNumber} (${quickbooksId})`);
    stats.ordersUpdated++;
  } else {
    order = await ctx.prisma.order.create({
      data: {
        ...orderData,
        createdAt: createdDate,
      },
    });
    if (ctx.debug) console.log(`Created order: ${order.orderNumber} (${quickbooksId})`);
    stats.ordersCreated++;
  }

  // Process line items
  await processOrderItems(ctx, order.id, lineItems);

  stats.processed++;
}

async function importSalesReceipts(filePath: string, debug: boolean) {
  const stats: SalesReceiptImportStats = {
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

  const parser = await createCsvParser(filePath);
  await processImport<SalesReceiptRow>(ctx, parser, (row) => processSalesReceiptRow(ctx, row));

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
