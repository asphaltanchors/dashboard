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
  async processRow(row: InvoiceRow): Promise<void> {
    const stats = this.ctx.stats;
    const customerName = row['Customer'];

    if (!customerName) {
      stats.warnings.push(`Skipping row: Missing Customer Name`);
      return;
    }

    // Skip empty lines or special items
    if (!row['Product/Service'] || 
        ['NJ Sales Tax', 'Shipping', 'Handling Fee', 'Discount'].includes(row['Product/Service'])) {
      if (this.ctx.debug) {
        console.log(`Skipping line: ${row['Product/Service'] || 'Empty product'}`);
      }
      return;
    }

    // Create line item
    const lineItems: OrderItemData[] = [{
      productCode: row['Product/Service'],
      description: row['Product/Service Description'],
      quantity: parseFloat(row['Product/Service Quantity'] || '0'),
      unitPrice: parseFloat(row['Product/Service Rate'] || '0'),
      amount: parseFloat(row['Product/Service  Amount'] || '0'),
      serviceDate: parseDate(row['Product/Service Service Date'])
    }];

    // Process addresses - combine multiple lines
    const billingAddress = await processAddress(this.ctx, {
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

    const shippingAddress = await processAddress(this.ctx, {
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
    const existingOrder = await this.ctx.prisma.order.findFirst({
      where: {
        OR: [
          { quickbooksId: row['QuickBooks Internal Id'] },
          { orderNumber: row['Invoice No'] }
        ]
      }
    });

    // Find or create customer
    const customerId = await this.findOrCreateCustomer(customerName);

    const orderData = {
      orderNumber: row['Invoice No'],
      orderDate,
      customerId,
      billingAddressId: billingAddress?.id || null,
      shippingAddressId: shippingAddress?.id || null,
      status: row['Status'] === 'Paid' ? OrderStatus.CLOSED : OrderStatus.OPEN,
      paymentStatus: row['Status'] === 'Paid' ? PaymentStatus.PAID : PaymentStatus.UNPAID,
      paymentMethod: 'Invoice',
      paymentDate: null,
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
      sourceData: row,
    };

    const order = await this.createOrUpdateOrder(orderData, existingOrder);
    await this.processOrderItems(order.id, lineItems);

    stats.processed++;
  }
}
