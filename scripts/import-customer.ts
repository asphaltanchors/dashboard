import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { PrismaClient, EmailType, PhoneType } from '@prisma/client';
import { Command } from 'commander';

const prisma = new PrismaClient();

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

interface ImportStats {
  processed: number;
  companiesCreated: number;
  customersCreated: number;
  customersUpdated: number;
  warnings: string[];
}

const stats: ImportStats = {
  processed: 0,
  companiesCreated: 0,
  customersCreated: 0,
  customersUpdated: 0,
  warnings: [],
};

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

function parseDate(dateStr: string): Date {
  // Assuming date format MM-DD-YYYY
  const [month, day, year] = dateStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

async function processAddress(addressData: {
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
}, debug: boolean) {
  if (!addressData.line1) return null;

  // Look for existing address with exact match
  const existingAddress = await prisma.address.findFirst({
    where: {
      line1: addressData.line1,
      line2: addressData.line2 || null,
      line3: addressData.line3 || null,
      city: addressData.city,
      state: addressData.state || null,
      postalCode: addressData.postalCode || null,
      country: addressData.country || null,
    }
  });

  if (existingAddress) {
    if (debug) console.log(`Found existing address: ${existingAddress.line1}, ${existingAddress.city}`);
    return existingAddress;
  }

  const newAddress = await prisma.address.create({
    data: {
      line1: addressData.line1,
      line2: addressData.line2 || null,
      line3: addressData.line3 || null,
      city: addressData.city,
      state: addressData.state || null,
      postalCode: addressData.postalCode || null,
      country: addressData.country || null,
    },
  });

  if (debug) console.log(`Created new address: ${newAddress.line1}, ${newAddress.city}`);
  return newAddress;
}

async function processEmails(emails: string[], customerId: string, debug: boolean) {
  const emailList = emails
    .filter(Boolean)
    .flatMap(e => e.split(';'))
    .map(e => e.trim())
    .filter(Boolean);

  for (const email of emailList) {
    // Look for existing email record for this customer
    const existingEmail = await prisma.customerEmail.findFirst({
      where: { 
        email,
        customerId 
      }
    });

    if (existingEmail) {
      if (debug) console.log(`Found existing email record: ${email}`);
      continue;
    }

    await prisma.customerEmail.create({
      data: {
        email,
        type: EmailType.MAIN,
        isPrimary: emailList.indexOf(email) === 0,
        customerId,
      },
    });
    if (debug) console.log(`Created email record: ${email}`);
  }
}

async function processPhones(phones: { number: string; type: PhoneType }[], customerId: string, debug: boolean) {
  for (const { number, type } of phones) {
    if (!number) continue;
    const formattedPhone = formatPhone(number);
    const normalizedPhone = normalizePhone(number);
    
    if (formattedPhone && normalizedPhone) {
      // Look for existing phone with same normalized number
      const existingPhone = await prisma.$queryRaw<Array<{ id: string, phone: string }>>`
        SELECT id, phone 
        FROM "CustomerPhone"
        WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = ${normalizedPhone}
        AND "customerId" = ${customerId}
        LIMIT 1
      `;

      if (existingPhone.length > 0) {
        if (debug) console.log(`Found existing phone record: ${existingPhone[0].phone} (${type})`);
        // Use the existing formatted number
        continue;
      }

      await prisma.customerPhone.create({
        data: {
          phone: formattedPhone,
          type,
          isPrimary: phones.indexOf({ number, type }) === 0,
          customerId,
        },
      });
      if (debug) console.log(`Created phone record: ${formattedPhone} (${type})`);
    }
  }
}

async function processCustomerRow(row: CustomerRow, debug: boolean) {
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
    const company = await prisma.company.upsert({
      where: { domain },
      create: {
        domain,
        name: row['Company Name'] || null,
      },
      update: {},
    });
    companyDomain = company.domain;
    if (debug) console.log(`Processed company: ${domain}`);
    stats.companiesCreated++;
  }

  // Process addresses
  const billingAddress = await processAddress({
    line1: row['Billing Address Line 1'],
    line2: row['Billing Address Line 2'],
    line3: row['Billing Address Line 3'],
    city: row['Billing Address City'],
    state: row['Billing Address State'],
    postalCode: row['Billing Address Postal Code'],
    country: row['Billing Address Country'],
  }, debug);

  const shippingAddress = await processAddress({
    line1: row['Shipping Address Line 1'],
    line2: row['Shipping Address Line 2'],
    line3: row['Shipping Address Line 3'],
    city: row['Shipping Address City'],
    state: row['Shipping Address State'],
    postalCode: row['Shipping Address Postal Code'],
    country: row['Shipping Address Country'],
  }, debug);

  // Create or update customer
  // Find existing customer first
  const existingCustomer = await prisma.customer.findUnique({
    where: { quickbooksId }
  });

  const customer = existingCustomer 
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          customerName: row['Customer Name'],
          companyDomain,
          status: row['Status'].toLowerCase() === 'true' ? 'ACTIVE' : 'INACTIVE',
          modifiedAt: parseDate(row['Modified Date']),
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
    : await prisma.customer.create({
        data: {
          quickbooksId,
          customerName: row['Customer Name'],
          companyDomain,
          status: row['Status'].toLowerCase() === 'true' ? 'ACTIVE' : 'INACTIVE',
          createdAt: parseDate(row['Created Date']),
          modifiedAt: parseDate(row['Modified Date']),
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
  await processEmails(
    [row['Main Email'], row['CC Email']],
    customer.id,
    debug
  );

  await processPhones(
    [
      { number: row['Main Phone'], type: PhoneType.MAIN },
      { number: row['Mobile'], type: PhoneType.MOBILE },
      { number: row['Work Phone'], type: PhoneType.WORK },
      { number: row['Alt. Phone'], type: PhoneType.OTHER },
    ],
    customer.id,
    debug
  );

  if (debug) {
    console.log(`Processed customer: ${customer.customerName} (${quickbooksId})`);
  }

  stats.processed++;
}

async function importCustomers(filePath: string, debug: boolean) {
  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
    })
  );

  console.log('Starting import...');
  const startTime = Date.now();
  let lastProgressUpdate = startTime;

  try {
    for await (const row of parser) {
      // Process each customer in its own transaction
      await prisma.$transaction(
        async (tx) => {
          await processCustomerRow(row as CustomerRow, debug);
        },
        {
          timeout: 30000, // 30 second timeout per customer
          maxWait: 5000, // 5 seconds max wait for transaction to start
        }
      );

      // Show progress every 100 records or if 5 seconds have passed
      const now = Date.now();
      if (!debug && (stats.processed % 100 === 0 || now - lastProgressUpdate >= 5000)) {
        console.log(`Processed ${stats.processed} records...`);
        lastProgressUpdate = now;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\nImport completed successfully!');
    console.log('Statistics:');
    console.log(`- Records processed: ${stats.processed} in ${duration}s`);
    console.log(`- Companies created/updated: ${stats.companiesCreated}`);
    console.log(`- Customers created/updated: ${stats.processed}`);
    
    if (stats.warnings.length > 0) {
      console.log('\nWarnings:');
      stats.warnings.forEach((warning) => console.log(`- ${warning}`));
    }
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

const program = new Command();

program
  .name('import-customer')
  .description('Import customer data from QuickBooks CSV export')
  .argument('<file>', 'CSV file to import')
  .option('-d, --debug', 'Enable debug logging')
  .action(async (file: string, options: { debug: boolean }) => {
    try {
      await importCustomers(file, options.debug);
      process.exit(0);
    } catch (error) {
      console.error('Import failed:', error);
      process.exit(1);
    }
  });

program.parse();
