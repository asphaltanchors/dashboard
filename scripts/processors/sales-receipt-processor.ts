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
  async processRow(row: SalesReceiptRow): Promise<void> {
    const stats = this.ctx.stats;
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
    const billingAddress = await processAddress(this.ctx, {
      line1: row['Billing Address Line 1'],
      line2: row['Billing Address Line 2'],
      line3: row['Billing Address Line 3'],
      city: row['Billing Address City'],
      state: row['Billing Address State'],
      postalCode: row['Billing Address Postal Code'],
      country: row['Billing Address Country'],
    });

    const shippingAddress = await processAddress(this.ctx, {
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
    const existingOrder = await this.ctx.prisma.order.findFirst({
      where: { quickbooksId }
    });

    // Find or create customer
    const customerId = await this.findOrCreateCustomer(customerName);

    const orderData = {
      orderNumber: row['Sales Receipt No'],
      orderDate,
      customerId,
      billingAddressId: billingAddress?.id || null,
      shippingAddressId: shippingAddress?.id || null,
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

    const order = await this.createOrUpdateOrder(orderData, existingOrder);
    await this.processOrderItems(order.id, lineItems);

    stats.processed++;
  }
}
