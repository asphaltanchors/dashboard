import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ImportContext } from '../shared/types';
import { BaseOrderProcessor } from '../shared/order-processor';
import { OrderItemData } from '../shared/order-types';
import { parseDate, parseDecimal, processAddress } from '../shared/utils';

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

export class SalesReceiptProcessor extends BaseOrderProcessor {
  private pendingReceipts: Map<string, SalesReceiptRow[]> = new Map();
  private readonly batchSize: number;

  constructor(ctx: ImportContext, batchSize: number = 100) {
    super(ctx);
    this.batchSize = batchSize;
  }

  async processRow(row: SalesReceiptRow): Promise<void> {
    try {
      const stats = this.ctx.stats;
      const quickbooksId = row['QuickBooks Internal Id'];
      
      if (!quickbooksId) {
        stats.warnings.push(`Skipping row: Missing QuickBooks ID`);
        return;
      }

      // Collect rows for each receipt
      const existingRows = this.pendingReceipts.get(quickbooksId) || [];
      existingRows.push(row);
      this.pendingReceipts.set(quickbooksId, existingRows);

      // Process batch if:
      // 1. We've collected all rows for this receipt (detected by Total Amount), or
      // 2. We've hit the batch size limit
      const hasTotal = parseDecimal(row['Total Amount']) > 0;
      if (hasTotal || this.pendingReceipts.size >= this.batchSize) {
        try {
          if (hasTotal) {
            // Process just this receipt
            await this.processReceipt(quickbooksId, existingRows);
            this.pendingReceipts.delete(quickbooksId);
          } else {
            // Process all complete receipts in the current batch
            await this.processBatch();
          }

          // Suggest garbage collection after processing significant chunks
          if (stats.processed % 5000 === 0) {
            global.gc?.();
          }
        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown error';
          stats.warnings.push(`Error processing receipt ${quickbooksId}: ${errorMessage}`);
          // Clean up the failed receipt to prevent memory leaks
          this.pendingReceipts.delete(quickbooksId);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.ctx.stats.warnings.push(`Unexpected error processing row: ${errorMessage}`);
      // Ensure we don't leak memory even on unexpected errors
      this.pendingReceipts.clear();
    }
  }

  private async processBatch(): Promise<void> {
    try {
      const entries = Array.from(this.pendingReceipts.entries());
      for (const [quickbooksId, rows] of entries) {
        // Check if we have found a total amount row for this receipt
        const hasTotal = rows.some(row => parseDecimal(row['Total Amount']) > 0);
        if (hasTotal) {
          try {
            await this.processReceipt(quickbooksId, rows);
          } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error';
            this.ctx.stats.warnings.push(`Failed to process receipt ${quickbooksId}: ${errorMessage}`);
          } finally {
            // Clean up memory regardless of success/failure
            this.pendingReceipts.delete(quickbooksId);
            
            // Suggest garbage collection after processing large batches
            if (this.ctx.stats.processed % 1000 === 0) {
              global.gc?.();
            }
          }
        }
      }
    } catch (error) {
      // Clear all pending receipts on critical error to prevent memory leaks
      this.pendingReceipts.clear();
      throw error;
    }
  }

  async finalize(): Promise<void> {
    try {
      // Process any remaining receipts
      await this.processBatch();
      
      // If any receipts are left without totals, log warnings
      const remainingReceipts = Array.from(this.pendingReceipts.entries());
      for (const [quickbooksId, rows] of remainingReceipts) {
        this.ctx.stats.warnings.push(`Receipt ${quickbooksId}: No row has a total amount`);
        // Clean up each remaining receipt after logging
        this.pendingReceipts.delete(quickbooksId);
      }
    } finally {
      // Ensure pendingReceipts is cleared even if errors occur
      this.pendingReceipts.clear();
      // Final garbage collection
      global.gc?.();
    }
  }

  private createLineItem(row: SalesReceiptRow): OrderItemData | null {
    // Skip tax and shipping line items
    if (!row['Product/Service'] || 
        ['NJ Sales Tax', 'Shipping', 'Discount'].includes(row['Product/Service'])) {
      return null;
    }

    return {
      productCode: row['Product/Service'],
      description: row['Product/Service Description'],
      quantity: parseFloat(row['Product/Service Quantity'] || '0'),
      unitPrice: parseFloat(row['Product/Service Rate'] || '0'),
      amount: parseFloat(row['Product/Service Amount'] || '0'),
      serviceDate: parseDate(row['Product/Service Service Date'])
    };
  }

  private determineClass(orderNumber: string, customerName: string): string | null {
    // Check for eStore pattern: 3D- followed by 4-5 digits
    if (/^3D-\d{4,5}$/.test(orderNumber)) {
      return 'eStore';
    }
    
    // Check for Amazon pattern: XXX-XXXXXXX (where X is any character, not just uppercase letters)
    if (/^[A-Z0-9]{3}-\d{7}$/.test(orderNumber)) {
      if (customerName.includes('Amazon FBA')) {
        return 'Amazon FBA';
      }
      if (customerName.includes('Amazon')) {
        return 'Amazon Direct';
      }
    }
    
    return null;
  }

  private async processReceipt(quickbooksId: string, rows: SalesReceiptRow[]): Promise<void> {
    const stats = this.ctx.stats;
    
    // Find rows with total amounts
    const rowsWithTotal = rows.filter(row => parseDecimal(row['Total Amount']) > 0);
    
    if (rowsWithTotal.length === 0) {
      stats.warnings.push(`Receipt ${quickbooksId}: No row has a total amount`);
      return;
    }
    
    if (rowsWithTotal.length > 1) {
      stats.warnings.push(`Receipt ${quickbooksId}: Multiple rows have total amounts`);
      return;
    }

    const primaryRow = rowsWithTotal[0];
    const customerName = primaryRow['Customer'];

    if (!customerName) {
      stats.warnings.push(`Receipt ${quickbooksId}: Missing Customer Name`);
      return;
    }

    // Process line items in smaller chunks to manage memory
    const lineItems: OrderItemData[] = [];
    const chunkSize = 50; // Process line items in chunks of 50
    
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const chunkItems = chunk
        .map(row => this.createLineItem(row))
        .filter((item): item is OrderItemData => item !== null);
      lineItems.push(...chunkItems);
      
      // Allow GC to clean up the processed chunk
      if (i > 0 && i % 200 === 0) {
        global.gc?.();
      }
    }

    // Process addresses from primary row
    const billingAddress = await processAddress(this.ctx, {
      line1: primaryRow['Billing Address Line 1'],
      line2: primaryRow['Billing Address Line 2'],
      line3: primaryRow['Billing Address Line 3'],
      city: primaryRow['Billing Address City'],
      state: primaryRow['Billing Address State'],
      postalCode: primaryRow['Billing Address Postal Code'],
      country: primaryRow['Billing Address Country'],
    });

    const shippingAddress = await processAddress(this.ctx, {
      line1: primaryRow['Shipping Address Line 1'],
      line2: primaryRow['Shipping Address Line 2'],
      line3: primaryRow['Shipping Address Line 3'],
      city: primaryRow['Shipping Address City'],
      state: primaryRow['Shipping Address State'],
      postalCode: primaryRow['Shipping Address Postal Code'],
      country: primaryRow['Shipping Address Country'],
    });

    // Parse dates from primary row
    const orderDate = parseDate(primaryRow['Sales Receipt Date']) || new Date();
    const dueDate = parseDate(primaryRow['Due Date']);
    const createdDate = parseDate(primaryRow['Created Date']) || new Date();
    const modifiedDate = parseDate(primaryRow['Modified Date']) || new Date();
    const shipDate = parseDate(primaryRow['Ship Date']);

    // Parse amounts from primary row
    const taxAmount = parseDecimal(primaryRow['Total Tax']);
    const totalAmount = parseDecimal(primaryRow['Total Amount']);

    // Create or update order
    const existingOrder = await this.ctx.prisma.order.findFirst({
      where: { quickbooksId }
    });

    // Find or create customer
    const customerId = await this.findOrCreateCustomer(customerName);

    const orderData = {
      orderNumber: primaryRow['Sales Receipt No'],
      orderDate,
      customerId,
      billingAddressId: billingAddress?.id || null,
      shippingAddressId: shippingAddress?.id || null,
      status: OrderStatus.CLOSED, // Sales receipts are always closed/paid
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: primaryRow['Payment Method'] || null,
      paymentDate: orderDate, // Sales receipts are paid at time of sale
      dueDate,
      terms: null,
      subtotal: totalAmount - taxAmount,
      taxAmount,
      taxPercent: taxAmount > 0 ? (taxAmount / (totalAmount - taxAmount)) * 100 : 0,
      totalAmount,
      shipDate,
      shippingMethod: primaryRow['Shipping Method'] || null,
      modifiedAt: modifiedDate,
      quickbooksId,
      class: this.determineClass(primaryRow['Sales Receipt No'], customerName),
      sourceData: primaryRow,
    };

    try {
      const order = await this.createOrUpdateOrder(orderData, existingOrder);
      
      // Process order items in chunks to prevent memory spikes
      const itemChunkSize = 100;
      for (let i = 0; i < lineItems.length; i += itemChunkSize) {
        const itemChunk = lineItems.slice(i, i + itemChunkSize);
        await this.processOrderItems(order.id, itemChunk);
        
        // Allow GC to clean up processed items
        if (i > 0 && i % 200 === 0) {
          global.gc?.();
        }
      }

      stats.processed++;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      throw new Error(`Failed to process order ${orderData.orderNumber}: ${errorMessage}`);
    } finally {
      // Clear references to large objects
      lineItems.length = 0;
    }
  }
}
