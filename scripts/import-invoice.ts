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
  class?: string;
}

interface InvoiceImportStats extends BaseImportStats {
  ordersCreated: number;
  ordersUpdated: number;
  productsCreated: number;
  productsUpdated: number;
  addressesCreated: number;
}

interface InvoiceRow {
  'S.No': string;
  'QuickBooks Link': string;
  'QuickBooks Internal Id': string;
  'Invoice No': string;
  'Customer': string;
  'Invoice Date': string;
  'Product/Service': string;
  'Product/Service Description': string;
  'Product/Service Quantity': string;
  'Product/Service Rate': string;
  'Product/Service  Amount': string; // Note extra space
  'Product/Service Class': string;
  'Product/Service Service Date': string;
  'Product/Service Sales Tax': string;
  'Ship Date': string;
  'Shipping Method': string;
  'Due Date': string;
  'Terms': string;
  'Status': string;
  'PO Number': string;
  'Sales Rep': string;
  'Total Tax': string;
  'Total Amount': string;
  'Created Date': string;
  'Modified Date': string;
  'Billing Address Line1': string;
  'Billing Address Line2': string;
  'Billing Address Line3': string;
  'Billing Address Line4': string;
  'Billing Address Line5': string;
  'Billing Address City': string;
  'Billing Address State': string;
  'Billing Address Postal Code': string;
  'Billing Address Country': string;
  'Shipping Address Line1': string;
  'Shipping Address Line2': string;
  'Shipping Address Line3': string;
  'Shipping Address Line4': string;
  'Shipping Address Line5': string;
  'Shipping Address City': string;
  'Shipping Address State': string;
  'Shipping Address Postal Code': string;
  'Shipping Address Country': string;
  [key: string]: string;
}

async function processOrderItems(ctx: ImportContext, orderId: string, items: OrderItemData[]) {
  const stats = ctx.stats as InvoiceImportStats;

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

    // Create order item without sourceData until schema is updated
    await ctx.prisma.orderItem.create({
      data: {
        orderId,
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        serviceDate: item.serviceDate
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

async function processInvoiceRow(ctx: ImportContext, row: InvoiceRow) {
  const stats = ctx.stats as InvoiceImportStats;
  const customerName = row['Customer'];

  if (!customerName) {
    stats.warnings.push(`Skipping row: Missing Customer Name`);
    return;
  }

  // Skip empty lines or special items
  if (!row['Product/Service'] || 
      ['NJ Sales Tax', 'Shipping', 'Handling Fee', 'Discount'].includes(row['Product/Service'])) {
    if (ctx.debug) {
      console.log(`Skipping line: ${row['Product/Service'] || 'Empty product'}`);
    }
    return;
  }

  // Create line item
  let lineItems: OrderItemData[] = [];
  lineItems.push({
    productCode: row['Product/Service'],
    description: row['Product/Service Description'],
    quantity: parseFloat(row['Product/Service Quantity'] || '0'),
    unitPrice: parseFloat(row['Product/Service Rate'] || '0'),
    amount: parseFloat(row['Product/Service  Amount'] || '0'), // Note extra space
    serviceDate: parseDate(row['Product/Service Service Date']),
    class: row['Product/Service Class']
  });

  // Process addresses - combine multiple lines
  const billingAddress = await processAddress(ctx, {
    line1: row['Billing Address Line1'],
    line2: [row['Billing Address Line2'], row['Billing Address Line3']]
      .filter(Boolean)
      .join(', '),
    line3: [row['Billing Address Line4'], row['Billing Address Line5']]
      .filter(Boolean)
      .join(', '),
    city: row['Billing Address City'],
    state: row['Billing Address State'],
    postalCode: row['Billing Address Postal Code'],
    country: row['Billing Address Country'],
  });

  const shippingAddress = await processAddress(ctx, {
    line1: row['Shipping Address Line1'],
    line2: [row['Shipping Address Line2'], row['Shipping Address Line3']]
      .filter(Boolean)
      .join(', '),
    line3: [row['Shipping Address Line4'], row['Shipping Address Line5']]
      .filter(Boolean)
      .join(', '),
    city: row['Shipping Address City'],
    state: row['Shipping Address State'],
    postalCode: row['Shipping Address Postal Code'],
    country: row['Shipping Address Country'],
  });

  // Parse dates
  const orderDate = parseDate(row['Invoice Date']) || new Date();
  const dueDate = parseDate(row['Due Date']);
  const createdDate = parseDate(row['Created Date']) || new Date();
  const modifiedDate = parseDate(row['Modified Date']) || new Date();
  const shipDate = parseDate(row['Ship Date']);

  // Parse amounts
  const taxAmount = parseDecimal(row['Total Tax']);
  const totalAmount = parseDecimal(row['Total Amount']);

  // Find existing order by QuickBooks ID or order number
  const existingOrder = await ctx.prisma.order.findFirst({
    where: {
      OR: [
        { quickbooksId: row['QuickBooks Internal Id'] },
        { orderNumber: row['Invoice No'] }
      ]
    }
  });

  if (existingOrder && ctx.debug) {
    console.log(`Found existing order: ${existingOrder.orderNumber} (${existingOrder.quickbooksId})`);
    if (existingOrder.status !== (row['Status'] === 'Paid' ? OrderStatus.CLOSED : OrderStatus.OPEN) ||
        existingOrder.paymentStatus !== (row['Status'] === 'Paid' ? PaymentStatus.PAID : PaymentStatus.UNPAID)) {
      console.log(`Updating status from ${existingOrder.status}/${existingOrder.paymentStatus} to ${row['Status']}`);
    }
  }

  // Find or create customer
  const customerId = await findOrCreateCustomer(ctx, customerName);

  const orderData = {
    orderNumber: row['Invoice No'],
    orderDate,
    sourceType: OrderSourceType.INVOICE,
    customerId,
    billingAddressId: billingAddress?.id,
    shippingAddressId: shippingAddress?.id,
    status: row['Status'] === 'Paid' ? OrderStatus.CLOSED : OrderStatus.OPEN,
    paymentStatus: row['Status'] === 'Paid' ? PaymentStatus.PAID : PaymentStatus.UNPAID,
    paymentMethod: null, // Payment details added when payment is received
    paymentDate: null, // Payment date added when payment is received
    dueDate,
    terms: row['Terms'] || null,
    subtotal: totalAmount - taxAmount,
    taxAmount,
    taxPercent: taxAmount > 0 ? (taxAmount / (totalAmount - taxAmount)) * 100 : 0,
    totalAmount,
    shipDate,
    shippingMethod: row['Shipping Method'] || null,
    modifiedAt: modifiedDate,
    quickbooksId: row['QuickBooks Internal Id'],
    poNumber: row['PO Number'],
    sourceData: {
      ...row,
      salesRep: row['Sales Rep']
    },
  };

  let order;
  if (existingOrder) {
    order = await ctx.prisma.order.update({
      where: { id: existingOrder.id },
      data: orderData,
    });
    if (ctx.debug) console.log(`Updated order: ${order.orderNumber}`);
    stats.ordersUpdated++;
  } else {
    order = await ctx.prisma.order.create({
      data: {
        ...orderData,
        createdAt: createdDate,
      },
    });
    if (ctx.debug) console.log(`Created order: ${order.orderNumber}`);
    stats.ordersCreated++;
  }

  // Process line items
  await processOrderItems(ctx, order.id, lineItems);

  stats.processed++;
}

async function importInvoices(filePath: string, debug: boolean) {
  const stats: InvoiceImportStats = {
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
  await processImport<InvoiceRow>(ctx, parser, (row) => processInvoiceRow(ctx, row));

  // Log additional statistics
  console.log(`- Orders created: ${stats.ordersCreated}`);
  console.log(`- Orders updated: ${stats.ordersUpdated}`);
  console.log(`- Products created: ${stats.productsCreated}`);
  console.log(`- Products updated: ${stats.productsUpdated}`);
  console.log(`- Addresses created: ${stats.addressesCreated}`);
}

setupImportCommand(
  'import-invoice',
  'Import invoice data from CSV export',
  importInvoices
);
