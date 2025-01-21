import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ImportContext } from '../shared/types';
import { BaseOrderProcessor } from '../shared/order-processor';
import { OrderItemData } from '../shared/order-types';
import { parseDate, parseDecimal, processAddress } from '../shared/utils';

interface InvoiceRow {
  'QuickBooks Internal Id': string;
  'Invoice No': string;
  'Customer': string;
  'Invoice Date': string;
  'Product/Service': string;
  'Product/Service Description': string;
  'Product/Service Quantity': string;
  'Product/Service Rate': string;
  'Product/Service  Amount': string;
  'Product/Service Class': string;
  'Product/Service Service Date': string;
  'Ship Date': string;
  'Shipping Method': string;
  'Due Date': string;
  'Terms': string;
  'Status': string;
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

export class InvoiceProcessor extends BaseOrderProcessor {
  private pendingInvoices: Map<string, InvoiceRow[]> = new Map();
  private readonly batchSize: number;
  private processedCount: number = 0;

  constructor(ctx: ImportContext, batchSize: number = 100) {
    super(ctx);
    this.batchSize = batchSize;
  }

  async processRow(row: InvoiceRow): Promise<void> {
    const stats = this.ctx.stats;
    const invoiceNo = row['Invoice No'];
    
    if (!invoiceNo) {
      stats.warnings.push(`Skipping row: Missing Invoice Number`);
      return;
    }

    // Collect rows for each invoice
    const existingRows = this.pendingInvoices.get(invoiceNo) || [];
    const isNewInvoice = existingRows.length === 0;
    
    existingRows.push(row);
    this.pendingInvoices.set(invoiceNo, existingRows);

    // Process batch if:
    // 1. We've collected all rows for this invoice (detected by Total Amount), or
    // 2. We've hit the batch size limit
    const hasTotal = parseDecimal(row['Total Amount']) > 0;
    if (hasTotal || this.pendingInvoices.size >= this.batchSize) {
      if (hasTotal) {
        // Process just this invoice
        await this.processInvoice(invoiceNo, existingRows);
        this.pendingInvoices.delete(invoiceNo);
      } else {
        // Process all complete invoices in the current batch
        await this.processBatch();
      }
    }
  }

  private async processBatch(): Promise<void> {
    for (const [invoiceNo, rows] of this.pendingInvoices.entries()) {
      // Check if we have found a total amount row for this invoice
      const hasTotal = rows.some(row => parseDecimal(row['Total Amount']) > 0);
      if (hasTotal) {
        await this.processInvoice(invoiceNo, rows);
        this.pendingInvoices.delete(invoiceNo);
      }
    }
  }

  private createLineItem(row: InvoiceRow): OrderItemData | null {
    // Skip empty lines or special items
    if (!row['Product/Service'] || 
        ['NJ Sales Tax', 'Shipping', 'Handling Fee', 'Discount'].includes(row['Product/Service'])) {
      if (this.ctx.debug) {
        console.log(`Skipping line: ${row['Product/Service'] || 'Empty product'}`);
      }
      return null;
    }

    return {
      productCode: row['Product/Service'],
      description: row['Product/Service Description'],
      quantity: parseFloat(row['Product/Service Quantity'] || '0'),
      unitPrice: parseFloat(row['Product/Service Rate'] || '0'),
      amount: parseFloat(row['Product/Service  Amount'] || '0'),
      serviceDate: parseDate(row['Product/Service Service Date'])
    };
  }

  async finalize(): Promise<void> {
    // Process any remaining invoices
    await this.processBatch();
    
    // If any invoices are left without totals, log warnings
    for (const [invoiceNo, rows] of this.pendingInvoices.entries()) {
      this.ctx.stats.warnings.push(`Invoice ${invoiceNo}: No row has a total amount`);
    }
    
    // Clear any remaining pending invoices
    this.pendingInvoices.clear();
  }

  private async processInvoice(invoiceNo: string, rows: InvoiceRow[]): Promise<void> {
    const stats = this.ctx.stats;
    
    // Find rows with total amounts
    const rowsWithTotal = rows.filter(row => parseDecimal(row['Total Amount']) > 0);
    
    if (rowsWithTotal.length === 0) {
      stats.warnings.push(`Invoice ${invoiceNo}: No row has a total amount`);
      return;
    }
    
    if (rowsWithTotal.length > 1) {
      stats.warnings.push(`Invoice ${invoiceNo}: Multiple rows have total amounts`);
      return;
    }

    const primaryRow = rowsWithTotal[0];
    const customerName = primaryRow['Customer'];

    if (!customerName) {
      stats.warnings.push(`Invoice ${invoiceNo}: Missing Customer Name`);
      return;
    }

    // Create line items from all valid rows
    const lineItems: OrderItemData[] = rows
      .map(row => this.createLineItem(row))
      .filter((item): item is OrderItemData => item !== null);

    // Process addresses from primary row
    const billingAddress = await processAddress(this.ctx, {
      line1: primaryRow['Billing Address Line1'],
      line2: [primaryRow['Billing Address Line2'], primaryRow['Billing Address Line3']]
        .filter(Boolean)
        .join(', '),
      line3: [primaryRow['Billing Address Line4'], primaryRow['Billing Address Line5']]
        .filter(Boolean)
        .join(', '),
      city: primaryRow['Billing Address City'],
      state: primaryRow['Billing Address State'],
      postalCode: primaryRow['Billing Address Postal Code'],
      country: primaryRow['Billing Address Country'],
    });

    const shippingAddress = await processAddress(this.ctx, {
      line1: primaryRow['Shipping Address Line1'],
      line2: [primaryRow['Shipping Address Line2'], primaryRow['Shipping Address Line3']]
        .filter(Boolean)
        .join(', '),
      line3: [primaryRow['Shipping Address Line4'], primaryRow['Shipping Address Line5']]
        .filter(Boolean)
        .join(', '),
      city: primaryRow['Shipping Address City'],
      state: primaryRow['Shipping Address State'],
      postalCode: primaryRow['Shipping Address Postal Code'],
      country: primaryRow['Shipping Address Country'],
    });

    // Parse dates from primary row
    const orderDate = parseDate(primaryRow['Invoice Date']) || new Date();
    const dueDate = parseDate(primaryRow['Due Date']);
    const createdDate = parseDate(primaryRow['Created Date']) || new Date();
    const modifiedDate = parseDate(primaryRow['Modified Date']) || new Date();
    const shipDate = parseDate(primaryRow['Ship Date']);

    // Parse amounts from primary row (the one with total)
    const taxAmount = parseDecimal(primaryRow['Total Tax']);
    const totalAmount = parseDecimal(primaryRow['Total Amount']);

    // Find existing order by QuickBooks ID or order number
    const existingOrder = await this.ctx.prisma.order.findFirst({
      where: {
        OR: [
          { quickbooksId: primaryRow['QuickBooks Internal Id'] },
          { orderNumber: primaryRow['Invoice No'] }
        ]
      }
    });

    // Find or create customer
    const customerId = await this.findOrCreateCustomer(customerName);

    const orderData = {
      orderNumber: primaryRow['Invoice No'],
      orderDate,
      customerId,
      billingAddressId: billingAddress?.id || null,
      shippingAddressId: shippingAddress?.id || null,
      status: primaryRow['Status'] === 'Paid' ? OrderStatus.CLOSED : OrderStatus.OPEN,
      paymentStatus: primaryRow['Status'] === 'Paid' ? PaymentStatus.PAID : PaymentStatus.UNPAID,
      paymentMethod: 'Invoice',
      paymentDate: null,
      dueDate,
      terms: primaryRow['Terms'] || null,
      subtotal: totalAmount - taxAmount,
      taxAmount,
      taxPercent: taxAmount > 0 ? (taxAmount / (totalAmount - taxAmount)) * 100 : 0,
      totalAmount,
      shipDate,
      shippingMethod: primaryRow['Shipping Method'] || null,
      modifiedAt: modifiedDate,
      quickbooksId: primaryRow['QuickBooks Internal Id'],
      sourceData: primaryRow,
    };

    const order = await this.createOrUpdateOrder(orderData, existingOrder);
    await this.processOrderItems(order.id, lineItems);

    stats.processed++;
  }
}
