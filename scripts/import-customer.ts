import { PrismaClient, EmailType, PhoneType, Prisma } from '@prisma/client';
import { AddressData, BaseImportStats, ImportContext } from './shared/types';
import { BatchEmailProcessor, BatchPhoneProcessor, DEFAULT_BATCH_SIZE } from './shared/batch-utils';

class BatchCompanyProcessor {
  private batch: Map<string, {
    domain: string;
    name: string | null;
    createdAt: Date;
  }> = new Map();
  private existingDomains = new Set<string>();

  getDomain(domain: string): string | null {
    return this.existingDomains.has(domain) ? domain : null;
  }
  
  constructor(
    private prisma: PrismaClient,
    private batchSize: number = DEFAULT_BATCH_SIZE
  ) {}

  async add(record: {
    domain: string;
    name: string | null;
    createdAt: Date;
  }): Promise<string> {
    this.batch.set(record.domain, record);
    
    if (this.batch.size >= this.batchSize) {
      await this.flush();
    }
    
    return record.domain;
  }

  async flush(): Promise<void> {
    if (this.batch.size === 0) return;

    const records = Array.from(this.batch.values());
    
    // First check which domains already exist
    const existingCompanies = await this.prisma.company.findMany({
      where: {
        domain: {
          in: Array.from(this.batch.keys())
        }
      },
      select: { domain: true }
    });

    // Add existing domains to our set
    for (const company of existingCompanies) {
      this.existingDomains.add(company.domain);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const record of records) {
        await tx.company.upsert({
          where: { domain: record.domain },
          create: record,
          update: {}
        });
        this.existingDomains.add(record.domain);
      }
    });

    this.batch.clear();
  }
}

class BatchAddressProcessor {
  private batch: Array<AddressData & { hash: string }> = [];
  private processedAddresses = new Map<string, string>();
  
  constructor(
    private prisma: PrismaClient,
    private batchSize: number = DEFAULT_BATCH_SIZE
  ) {}

  private hashAddress(address: AddressData): string {
    return JSON.stringify({
      line1: address.line1,
      line2: address.line2,
      line3: address.line3,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country
    });
  }

  async add(address: AddressData): Promise<string | null> {
    if (!address.line1) return null;
    
    const hash = this.hashAddress(address);
    
    // Return existing address ID if we've processed this address before
    if (this.processedAddresses.has(hash)) {
      return this.processedAddresses.get(hash)!;
    }
    
    this.batch.push({ ...address, hash });
    
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
    
    return null; // Will be processed during flush
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const addresses = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const record of this.batch) {
        const { hash, ...addressData } = record;
        const address = await tx.address.create({ data: addressData });
        results.push({ hash, id: address.id });
      }
      return results;
    });

    // Update our processed addresses map
    for (const { hash, id } of addresses) {
      this.processedAddresses.set(hash, id);
    }

    this.batch = [];
  }

  getProcessedAddressId(address: AddressData): string | null {
    if (!address.line1) return null;
    const hash = this.hashAddress(address);
    return this.processedAddresses.get(hash) ?? null;
  }
}

interface CustomerBatchRecord {
  quickbooksId: string;
  customerName: string | null;
  companyDomain: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  modifiedAt: Date;
  taxCode: string | null;
  taxItem: string | null;
  resaleNumber: string | null;
  creditLimit: number | null;
  terms: string | null;
  billingAddressId: string | null;
  shippingAddressId: string | null;
  sourceData: any;
  isUpdate: boolean;
}

class BatchCustomerProcessor {
  private batch: CustomerBatchRecord[] = [];
  private customerIdMap = new Map<string, string>();

  getCustomerId(quickbooksId: string): string | undefined {
    return this.customerIdMap.get(quickbooksId);
  }
  
  constructor(
    private prisma: PrismaClient,
    private batchSize: number = DEFAULT_BATCH_SIZE
  ) {}

  async add(record: Omit<typeof this.batch[0], 'isUpdate'> & { 
    existingCustomerId?: string 
  }): Promise<{ quickbooksId: string; pending: boolean }> {
    const { existingCustomerId, ...data } = record;
    
    this.batch.push({
      ...data,
      isUpdate: !!existingCustomerId
    });
    
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
    
    return {
      quickbooksId: data.quickbooksId,
      pending: !existingCustomerId
    };
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const { updates, creates } = this.batch.reduce<{
      updates: Omit<CustomerBatchRecord, 'isUpdate'>[];
      creates: Omit<CustomerBatchRecord, 'isUpdate'>[];
    }>((acc, record) => {
      const { isUpdate, ...data } = record;
      if (isUpdate) {
        acc.updates.push(data);
      } else {
        acc.creates.push(data);
      }
      return acc;
    }, { updates: [], creates: [] });

    const results = await this.prisma.$transaction(async (tx) => {
      // Handle creates
      if (creates.length > 0) {
        const created = await tx.customer.createMany({
          data: creates.map(data => ({
            ...data,
            customerName: data.customerName ?? undefined,
            companyDomain: data.companyDomain ?? undefined,
            taxCode: data.taxCode ?? undefined,
            taxItem: data.taxItem ?? undefined,
            resaleNumber: data.resaleNumber ?? undefined,
            creditLimit: data.creditLimit ?? undefined,
            terms: data.terms ?? undefined,
            billingAddressId: data.billingAddressId ?? undefined,
            shippingAddressId: data.shippingAddressId ?? undefined,
          })) as Prisma.CustomerCreateManyInput[],
          skipDuplicates: true
        });

        // Get IDs of created customers
        if (created.count > 0) {
          const createdCustomers = await tx.customer.findMany({
            where: {
              quickbooksId: {
                in: creates.map(c => c.quickbooksId)
              }
            },
            select: {
              id: true,
              quickbooksId: true
            }
          });

          // Store the mapping
          for (const customer of createdCustomers) {
            this.customerIdMap.set(customer.quickbooksId, customer.id);
          }
        }
      }
      
      // Handle updates
      for (const update of updates) {
        const existing = await tx.customer.findUnique({
          where: { quickbooksId: update.quickbooksId },
          select: { id: true }
        });
        
        if (existing) {
          this.customerIdMap.set(update.quickbooksId, existing.id);
        }
        
        const { quickbooksId, ...data } = update;
        await tx.customer.update({
          where: { quickbooksId },
          data: {
            ...data,
            customerName: data.customerName ?? undefined,
            companyDomain: data.companyDomain ?? undefined,
            taxCode: data.taxCode ?? undefined,
            taxItem: data.taxItem ?? undefined,
            resaleNumber: data.resaleNumber ?? undefined,
            creditLimit: data.creditLimit ?? undefined,
            terms: data.terms ?? undefined,
            billingAddressId: data.billingAddressId ?? undefined,
            shippingAddressId: data.shippingAddressId ?? undefined,
          } as Prisma.CustomerUpdateInput
        });
      }
    });

    this.batch = [];
    return results;
  }
}
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

interface CustomerImportContext extends ImportContext {
  emailProcessor: BatchEmailProcessor;
  phoneProcessor: BatchPhoneProcessor;
  companyProcessor: BatchCompanyProcessor;
  addressProcessor: BatchAddressProcessor;
  customerProcessor: BatchCustomerProcessor;
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

async function processEmails(ctx: CustomerImportContext, emails: string[], customerId: string) {
  const emailList = emails
    .filter(Boolean)
    .flatMap(e => e.split(';'))
    .map(e => e.trim())
    .filter(Boolean);

  for (const email of emailList) {
    await ctx.emailProcessor.add({
      email,
      type: 'MAIN',
      isPrimary: emailList.indexOf(email) === 0,
      customerId,
    });
    if (ctx.debug) console.log(`Queued email for processing: ${email}`);
  }
}

async function processPhones(ctx: CustomerImportContext, phones: { number: string; type: PhoneType }[], customerId: string) {
  for (const { number, type } of phones) {
    if (!number) continue;
    const formattedPhone = formatPhone(number);
    
    if (formattedPhone) {
      await ctx.phoneProcessor.add({
        phone: formattedPhone,
        type,
        isPrimary: phones.indexOf({ number, type }) === 0,
        customerId,
      });
      if (ctx.debug) console.log(`Queued phone for processing: ${formattedPhone} (${type})`);
    }
  }
}

async function processCustomerRow(ctx: CustomerImportContext, row: CustomerRow) {
  const stats = ctx.stats as CustomerImportStats;
  const quickbooksId = row['QuickBooks Internal Id'];
  if (!quickbooksId) {
    stats.warnings.push(`Skipping row: Missing QuickBooks ID`);
    return;
  }

  // Process company if email domain exists
  const mainEmail = row['Main Email'];
  const domain = extractDomain(mainEmail);
  let companyDomain = null;

  if (domain) {
    await ctx.companyProcessor.add({
      domain,
      name: row['Company Name'] || null,
      createdAt: parseDate(row['Created Date']) || new Date(),
    });
    companyDomain = ctx.companyProcessor.getDomain(domain);
    if (ctx.debug) console.log(`Queued company for processing: ${domain}`);
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

  let billingAddressId = null;
  let shippingAddressId = null;

  if (areAddressesIdentical && billingAddressData.line1) {
    // If addresses are identical, process once and use for both
    billingAddressId = await ctx.addressProcessor.add(billingAddressData);
    shippingAddressId = billingAddressId;
    if (ctx.debug) console.log(`Queued identical address for billing and shipping`);
  } else {
    // Process addresses separately
    billingAddressId = await ctx.addressProcessor.add(billingAddressData);
    shippingAddressId = await ctx.addressProcessor.add(shippingAddressData);
  }

  // Check for existing customer
  const existingCustomer = await ctx.prisma.customer.findUnique({
    where: { quickbooksId },
    select: { id: true }
  });

  // Queue customer for batch processing
  const { quickbooksId: qbId, pending } = await ctx.customerProcessor.add({
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
    billingAddressId,
    shippingAddressId,
    sourceData: row,
    existingCustomerId: existingCustomer?.id
  });

  if (ctx.debug) {
    console.log(`Queued customer for processing: ${row['Customer Name']} (${quickbooksId})`);
  }

  // Only process contact information if customer already exists
  if (!pending) {
    const customerId = ctx.customerProcessor.getCustomerId(qbId);
    if (customerId) {
      await processEmails(ctx, [row['Main Email'], row['CC Email']], customerId);
      await processPhones(ctx, [
        { number: row['Main Phone'], type: PhoneType.MAIN },
        { number: row['Mobile'], type: PhoneType.MOBILE },
        { number: row['Work Phone'], type: PhoneType.WORK },
        { number: row['Alt. Phone'], type: PhoneType.OTHER },
      ], customerId);
    }
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

  const ctx: CustomerImportContext = {
    prisma,
    debug,
    stats,
    emailProcessor: new BatchEmailProcessor(prisma),
    phoneProcessor: new BatchPhoneProcessor(prisma),
    companyProcessor: new BatchCompanyProcessor(prisma),
    addressProcessor: new BatchAddressProcessor(prisma),
    customerProcessor: new BatchCustomerProcessor(prisma),
  };

  const parser = await createCsvParser(filePath);
  const csvData: CustomerRow[] = [];
  
  await processImport<CustomerRow>(ctx, parser, (row) => {
    csvData.push(row);
    return processCustomerRow(ctx, row);
  });

  // Process in correct order with retries for foreign key dependencies
  await ctx.companyProcessor.flush();
  await ctx.addressProcessor.flush();
  
  // Recheck company domains after company creation
  for (const row of csvData) {
    const domain = extractDomain(row['Main Email']);
    if (domain) {
      const companyDomain = ctx.companyProcessor.getDomain(domain);
      if (companyDomain) {
        const customer = await ctx.prisma.customer.findUnique({
          where: { quickbooksId: row['QuickBooks Internal Id'] },
          select: { id: true }
        });
        if (customer) {
          await ctx.prisma.customer.update({
            where: { id: customer.id },
            data: { companyDomain }
          });
        }
      }
    }
  }
  
  await ctx.customerProcessor.flush();
  
  // Now process contact info for all customers
  const rows = await ctx.prisma.customer.findMany({
    select: { id: true, quickbooksId: true }
  });
  
  for (const row of rows) {
    const customerRow = csvData.find((r: CustomerRow) => r['QuickBooks Internal Id'] === row.quickbooksId);
    if (customerRow) {
      await processEmails(ctx, [customerRow['Main Email'], customerRow['CC Email']], row.id);
      await processPhones(ctx, [
        { number: customerRow['Main Phone'], type: PhoneType.MAIN },
        { number: customerRow['Mobile'], type: PhoneType.MOBILE },
        { number: customerRow['Work Phone'], type: PhoneType.WORK },
        { number: customerRow['Alt. Phone'], type: PhoneType.OTHER },
      ], row.id);
    }
  }
  
  await ctx.emailProcessor.flush();
  await ctx.phoneProcessor.flush();

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
