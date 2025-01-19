import { PrismaClient, EmailType, PhoneType } from '@prisma/client';
import { AddressData, BaseImportStats, ImportContext } from './shared/types';
import { 
  createCsvParser, 
  parseDate, 
  processAddress, 
  processImport, 
  setupImportCommand 
} from './shared/utils';

const prisma = new PrismaClient();

interface CustomerImportStats extends BaseImportStats {
  companiesCreated: number;
  customersCreated: number;
  customersUpdated: number;
}

interface CustomerRow {
  'QuickBooks Internal Id': string;
  'Customer Name': string;
  'Company Name': string;
  'First Name': string;
  'Middle Name': string;
  'Last Name': string;
  'Main Email': string;
  'CC Email': string;
  'Main Phone': string;
  'Alt. Phone': string;
  'Work Phone': string;
  'Mobile': string;
  'Status': string;
  'Created Date': string;
  'Modified Date': string;
  'Tax Code': string;
  'Tax Item': string;
  'Resale No': string;
  'Credit Limit': string;
  'Terms': string;
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

function extractDomain(email: string): string | null {
  if (!email) return null;
  const match = email.match(/@([^@]+)$/);
  return match ? match[1].toLowerCase() : null;
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, ''); // Strip all non-numeric characters
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/[\(\)]/g, '') // Remove parentheses
    .replace(/\s+x/i, ' x') // Standardize extension format
    .trim();
}

async function processEmails(ctx: ImportContext, emails: string[], customerId: string) {
  const emailList = emails
    .filter(Boolean)
    .flatMap(e => e.split(';'))
    .map(e => e.trim())
    .filter(Boolean);

  for (const email of emailList) {
    const existingEmail = await ctx.prisma.customerEmail.findFirst({
      where: { 
        email,
        customerId 
      }
    });

    if (existingEmail) {
      if (ctx.debug) console.log(`Found existing email record: ${email}`);
      continue;
    }

    await ctx.prisma.customerEmail.create({
      data: {
        email,
        type: EmailType.MAIN,
        isPrimary: emailList.indexOf(email) === 0,
        customerId,
      },
    });
    if (ctx.debug) console.log(`Created email record: ${email}`);
  }
}

async function processPhones(ctx: ImportContext, phones: { number: string; type: PhoneType }[], customerId: string) {
  for (const { number, type } of phones) {
    if (!number) continue;
    const formattedPhone = formatPhone(number);
    const normalizedPhone = normalizePhone(number);
    
    if (formattedPhone && normalizedPhone) {
      const existingPhone = await ctx.prisma.$queryRaw<Array<{ id: string, phone: string }>>`
        SELECT id, phone 
        FROM "CustomerPhone"
        WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = ${normalizedPhone}
        AND "customerId" = ${customerId}
        LIMIT 1
      `;

      if (existingPhone.length > 0) {
        if (ctx.debug) console.log(`Found existing phone record: ${existingPhone[0].phone} (${type})`);
        continue;
      }

      await ctx.prisma.customerPhone.create({
        data: {
          phone: formattedPhone,
          type,
          isPrimary: phones.indexOf({ number, type }) === 0,
          customerId,
        },
      });
      if (ctx.debug) console.log(`Created phone record: ${formattedPhone} (${type})`);
    }
  }
}

async function processCustomerRow(ctx: ImportContext, row: CustomerRow) {
  const stats = ctx.stats as CustomerImportStats;
  const quickbooksId = row['QuickBooks Internal Id'];
  if (!quickbooksId) {
    stats.warnings.push(`Skipping row: Missing QuickBooks ID`);
    return;
  }

  // Process company first if email domain exists
  const mainEmail = row['Main Email'];
  const domain = extractDomain(mainEmail);
  let companyDomain = null;

  if (domain) {
    const company = await ctx.prisma.company.upsert({
      where: { domain },
      create: {
        domain,
        name: row['Company Name'] || null,
      },
      update: {},
    });
    companyDomain = company.domain;
    if (ctx.debug) console.log(`Processed company: ${domain}`);
    stats.companiesCreated++;
  }

  // Process addresses
  const billingAddressData = {
    line1: row['Billing Address Line 1'],
    line2: row['Billing Address Line 2'],
    line3: row['Billing Address Line 3'],
    city: row['Billing Address City'],
    state: row['Billing Address State'],
    postalCode: row['Billing Address Postal Code'],
    country: row['Billing Address Country'],
  };

  const shippingAddressData = {
    line1: row['Shipping Address Line 1'],
    line2: row['Shipping Address Line 2'],
    line3: row['Shipping Address Line 3'],
    city: row['Shipping Address City'],
    state: row['Shipping Address State'],
    postalCode: row['Shipping Address Postal Code'],
    country: row['Shipping Address Country'],
  };

  // Check if addresses are identical
  const areAddressesIdentical = 
    billingAddressData.line1 === shippingAddressData.line1 &&
    billingAddressData.line2 === shippingAddressData.line2 &&
    billingAddressData.line3 === shippingAddressData.line3 &&
    billingAddressData.city === shippingAddressData.city &&
    billingAddressData.state === shippingAddressData.state &&
    billingAddressData.postalCode === shippingAddressData.postalCode &&
    billingAddressData.country === shippingAddressData.country;

  let billingAddress, shippingAddress;
  
  if (areAddressesIdentical && billingAddressData.line1) {
    // If addresses are identical, process once and use for both
    billingAddress = await processAddress(ctx, billingAddressData);
    shippingAddress = billingAddress;
    if (ctx.debug) console.log(`Using same address for billing and shipping`);
  } else {
    // Process addresses separately
    billingAddress = await processAddress(ctx, billingAddressData);
    shippingAddress = await processAddress(ctx, shippingAddressData);
  }

  // Create or update customer
  const existingCustomer = await ctx.prisma.customer.findUnique({
    where: { quickbooksId }
  });

  const customer = existingCustomer 
    ? await ctx.prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          customerName: row['Customer Name'],
          companyDomain,
          status: row['Status'].toLowerCase() === 'true' ? 'ACTIVE' : 'INACTIVE',
          modifiedAt: parseDate(row['Modified Date']) || new Date(),
          taxCode: row['Tax Code'] || null,
          taxItem: row['Tax Item'] || null,
          resaleNumber: row['Resale No'] || null,
          creditLimit: row['Credit Limit'] ? parseFloat(row['Credit Limit']) : null,
          terms: row['Terms'] || null,
          billingAddressId: billingAddress?.id,
          shippingAddressId: shippingAddress?.id,
          sourceData: row,
        }
      })
    : await ctx.prisma.customer.create({
        data: {
          quickbooksId,
          customerName: row['Customer Name'],
          companyDomain,
          status: row['Status'].toLowerCase() === 'true' ? 'ACTIVE' : 'INACTIVE',
          createdAt: parseDate(row['Created Date']) || new Date(),
          modifiedAt: parseDate(row['Modified Date']) || new Date(),
          taxCode: row['Tax Code'] || null,
          taxItem: row['Tax Item'] || null,
          resaleNumber: row['Resale No'] || null,
          creditLimit: row['Credit Limit'] ? parseFloat(row['Credit Limit']) : null,
          terms: row['Terms'] || null,
          billingAddressId: billingAddress?.id,
          shippingAddressId: shippingAddress?.id,
          sourceData: row,
        }
      });

  // Process contact information
  await processEmails(ctx, [row['Main Email'], row['CC Email']], customer.id);
  await processPhones(ctx, [
    { number: row['Main Phone'], type: PhoneType.MAIN },
    { number: row['Mobile'], type: PhoneType.MOBILE },
    { number: row['Work Phone'], type: PhoneType.WORK },
    { number: row['Alt. Phone'], type: PhoneType.OTHER },
  ], customer.id);

  if (ctx.debug) {
    console.log(`Processed customer: ${customer.customerName} (${quickbooksId})`);
  }

  stats.processed++;
  if (existingCustomer) {
    stats.customersUpdated++;
  } else {
    stats.customersCreated++;
  }
}

async function importCustomers(filePath: string, debug: boolean) {
  const stats: CustomerImportStats = {
    processed: 0,
    companiesCreated: 0,
    customersCreated: 0,
    customersUpdated: 0,
    warnings: [],
  };

  const ctx: ImportContext = {
    prisma,
    debug,
    stats,
  };

  const parser = await createCsvParser(filePath);
  await processImport<CustomerRow>(ctx, parser, (row) => processCustomerRow(ctx, row));

  // Log additional statistics
  console.log(`- Companies created/updated: ${stats.companiesCreated}`);
  console.log(`- Customers created: ${stats.customersCreated}`);
  console.log(`- Customers updated: ${stats.customersUpdated}`);
}

setupImportCommand(
  'import-customer',
  'Import customer data from QuickBooks CSV export',
  importCustomers
);
