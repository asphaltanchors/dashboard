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
  
  constructor(
    private prisma: PrismaClient,
    private batchSize: number = 100,
    private stats?: CustomerImportStats
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

  async verifyDomain(domain: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    // Check our cache first
    if (this.existingDomains.has(domain)) {
      return true;
    }

    // If domain is in current batch, create it immediately
    if (this.batch.has(domain)) {
      await this.flush(tx);
    }

    // Always check database after flush
    const client = tx || this.prisma;
    const company = await client.company.findUnique({
      where: { domain },
      select: { domain: true }
    });

    if (company) {
      this.existingDomains.add(domain);
      return true;
    }

    return false;
  }

  async flush(tx?: Prisma.TransactionClient): Promise<void> {
    if (this.batch.size === 0) return;

    const client = tx || this.prisma;
    
    // Create companies one at a time
    for (const [domain, data] of this.batch.entries()) {
      // Use upsert to handle both create and update
      const company = await client.company.upsert({
        where: { domain },
        create: data,
        update: {
          name: data.name,
          createdAt: data.createdAt
        }
      });

      // Update cache
      this.existingDomains.add(company.domain);
      
      if (this.stats) {
        this.stats.companiesCreated++;
      }
    }

    this.batch.clear();
  }
}

class BatchAddressProcessor {
  private batch: Array<AddressData & { hash: string }> = [];
  private processedAddresses = new Map<string, string>();
  
  private stats?: CustomerImportStats;

  constructor(
    private prisma: PrismaClient,
    private batchSize: number = DEFAULT_BATCH_SIZE,
    stats?: CustomerImportStats
  ) {
    this.stats = stats;
  }

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

  async flush(tx?: Prisma.TransactionClient): Promise<void> {
    if (this.batch.length === 0) return;

    const client = tx || this.prisma;
    
    // First find any existing addresses
    const existingAddresses = await client.address.findMany({
      where: {
        OR: this.batch.map(({ hash, ...address }) => ({
          AND: {
            line1: address.line1,
            line2: address.line2 ?? null,
            line3: address.line3 ?? null,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country
          }
        }))
      },
      select: {
        id: true,
        line1: true,
        line2: true,
        line3: true,
        city: true,
        state: true,
        postalCode: true,
        country: true
      }
    });

    // Create a map of existing addresses by their hash
    const existingAddressMap = new Map<string, string>();
    for (const address of existingAddresses) {
      const addressData: AddressData = {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        line3: address.line3 ?? undefined,
        city: address.city,
        state: address.state ?? undefined,
        postalCode: address.postalCode ?? undefined,
        country: address.country ?? undefined
      };
      const hash = this.hashAddress(addressData);
      existingAddressMap.set(hash, address.id);
      this.processedAddresses.set(hash, address.id);
    }

    // Filter out addresses that already exist
    const newAddresses = this.batch.filter(({ hash }) => !existingAddressMap.has(hash));

    if (newAddresses.length > 0) {
      // Create new addresses
      const result = await client.address.createMany({
        data: newAddresses.map(({ hash, ...addressData }) => addressData),
        skipDuplicates: true
      });

      if (result.count > 0) {
        // Fetch the newly created addresses to get their IDs
        const createdAddresses = await client.address.findMany({
          where: {
            OR: newAddresses.map(({ hash, ...address }) => ({
              AND: {
                line1: address.line1,
                line2: address.line2 ?? null,
                line3: address.line3 ?? null,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country
              }
            }))
          },
          select: {
            id: true,
            line1: true,
            line2: true,
            line3: true,
            city: true,
            state: true,
            postalCode: true,
            country: true
          }
        });

        // Update our processed addresses map with new addresses
        for (const address of createdAddresses) {
          const addressData: AddressData = {
            line1: address.line1,
            line2: address.line2 ?? undefined,
            line3: address.line3 ?? undefined,
            city: address.city,
            state: address.state ?? undefined,
            postalCode: address.postalCode ?? undefined,
            country: address.country ?? undefined
          };
          const hash = this.hashAddress(addressData);
          this.processedAddresses.set(hash, address.id);
        }
      }
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
  private stats?: CustomerImportStats;

  getCustomerId(quickbooksId: string): string | undefined {
    return this.customerIdMap.get(quickbooksId);
  }
  
  constructor(
    private prisma: PrismaClient,
    private batchSize: number = DEFAULT_BATCH_SIZE,
    stats?: CustomerImportStats
  ) {
    this.stats = stats;
  }

  async add(record: Omit<typeof this.batch[0], 'isUpdate'> & { 
    existingCustomerId?: string 
  }): Promise<{ quickbooksId: string; pending: boolean }> {
    const { existingCustomerId, ...data } = record;
    
    // Check if customer already exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { quickbooksId: data.quickbooksId },
      select: { id: true }
    });

    const isUpdate = !!existingCustomer;
    
    this.batch.push({
      ...data,
      isUpdate
    });
    
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
    
    return {
      quickbooksId: data.quickbooksId,
      pending: !existingCustomerId
    };
  }

  async flush(tx?: Prisma.TransactionClient): Promise<void> {
    if (this.batch.length === 0) return;

    const client = tx || this.prisma;
    
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

    // Handle creates
    if (creates.length > 0) {
      // Process creates one at a time to handle relations properly
      const createdCustomers = await Promise.all(
        creates.map(async data => {
          // Create customer with company relation
          const createData: Prisma.CustomerUncheckedCreateInput = {
            quickbooksId: data.quickbooksId,
            customerName: data.customerName || '', // customerName is required
            status: data.status,
            createdAt: data.createdAt,
            modifiedAt: data.modifiedAt,
            companyDomain: data.companyDomain,
            taxCode: data.taxCode ?? undefined,
            taxItem: data.taxItem ?? undefined,
            resaleNumber: data.resaleNumber ?? undefined,
            creditLimit: data.creditLimit ?? undefined,
            terms: data.terms ?? undefined,
            billingAddressId: data.billingAddressId,
            shippingAddressId: data.shippingAddressId,
            sourceData: data.sourceData
          };

          return client.customer.create({
            data: createData,
            include: {
              company: true,
              billingAddress: true,
              shippingAddress: true
            }
          });
        })
      );

      // Update stats and store mappings
      if (createdCustomers.length > 0) {
        if (this.stats) {
          this.stats.customersCreated += createdCustomers.length;
        }

        // Store the mapping
        for (const customer of createdCustomers) {
          this.customerIdMap.set(customer.quickbooksId, customer.id);
        }
      }
    }
    
    // Handle updates in bulk
    if (updates.length > 0) {
      // First get all customer IDs for the updates
      const existingCustomers = await client.customer.findMany({
        where: {
          quickbooksId: {
            in: updates.map(u => u.quickbooksId)
          }
        },
        select: {
          id: true,
          quickbooksId: true
        }
      });

      // Update customerIdMap and stats
      for (const customer of existingCustomers) {
        this.customerIdMap.set(customer.quickbooksId, customer.id);
      }
      if (this.stats) {
        this.stats.customersUpdated += existingCustomers.length;
      }

      // Perform updates in chunks to avoid query size limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(update => {
          const { quickbooksId, ...data } = update;
          return client.customer.update({
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
        }));
      }
    }

    this.batch = [];
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
  pendingContactInfo: Map<string, {
    emails: Array<{ email: string; isPrimary: boolean }>;
    phones: Array<{ number: string; type: PhoneType; isPrimary: boolean }>;
  }>;
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
    emailProcessor: new BatchEmailProcessor(prisma, 100),
    phoneProcessor: new BatchPhoneProcessor(prisma, 100),
    companyProcessor: new BatchCompanyProcessor(prisma, 100, stats),
    addressProcessor: new BatchAddressProcessor(prisma, 100, stats),
    customerProcessor: new BatchCustomerProcessor(prisma, 100, stats),
    pendingContactInfo: new Map(),
  };

  const parser = await createCsvParser(filePath);
  
  // Process all records in a single pass
  await processImport<CustomerRow>(ctx, parser, async (row) => {
    if (ctx.debug) console.log(`Processing row for customer: ${row['Customer Name']}`);
    
    const quickbooksId = row['QuickBooks Internal Id'];
    if (!quickbooksId) {
      stats.warnings.push(`Skipping row: Missing QuickBooks ID`);
      return;
    }

    // Process all emails first to extract domains
    const emails = [row['Main Email'], row['CC Email']]
      .filter(Boolean)
      .flatMap(e => e.split(/[;,]/))
      .map(e => e.trim())
      .filter(Boolean);

    // Extract domain from first valid email and ensure company exists
    let companyDomain = null;
    for (const email of emails) {
      const domain = extractDomain(email);
      if (domain) {
        // Queue company creation/update and flush immediately
        await ctx.companyProcessor.add({
          domain,
          name: row['Company Name'] || null,
          createdAt: parseDate(row['Created Date']) || new Date(),
        });
        
        // Force immediate flush and verify
        await ctx.companyProcessor.flush();
        
        const exists = await ctx.companyProcessor.verifyDomain(domain);
        
        if (exists) {
          companyDomain = domain;
        }
        break; // Use first valid domain
      }
    }

    if (ctx.debug) console.log('Processing addresses...');
    
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
    } else {
      // Process addresses separately
      billingAddressId = await ctx.addressProcessor.add(billingAddressData);
      shippingAddressId = await ctx.addressProcessor.add(shippingAddressData);
    }

    // Process customer
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
    });

    // Store contact info for processing after customer creation
    const phones = [
      { number: row['Main Phone'], type: PhoneType.MAIN },
      { number: row['Mobile'], type: PhoneType.MOBILE },
      { number: row['Work Phone'], type: PhoneType.WORK },
      { number: row['Alt. Phone'], type: PhoneType.OTHER },
    ]
      .map(p => ({ ...p, number: formatPhone(p.number) }))
      .filter(p => p.number)
      .map((p, index) => ({
        number: p.number,
        type: p.type,
        isPrimary: index === 0
      }));

    ctx.pendingContactInfo.set(quickbooksId, {
      emails: emails.map((email, index) => ({
        email,
        isPrimary: index === 0
      })),
      phones
    });

    stats.processed++;
    
    // Flush processors every 100 records
    if (stats.processed % 100 === 0) {
      await processFlush(ctx);
      
      // Log progress
      console.log(`Processed ${stats.processed} records...`);
      console.log(`- Companies created: ${stats.companiesCreated}`);
      console.log(`- Customers created: ${stats.customersCreated}`);
      console.log(`- Customers updated: ${stats.customersUpdated}`);
    }
  });

  // Process final flush
  await processFlush(ctx);

  // Log additional statistics
  console.log(`- Companies created/updated: ${stats.companiesCreated}`);
  console.log(`- Customers created: ${stats.customersCreated}`);
  console.log(`- Customers updated: ${stats.customersUpdated}`);
}

async function processFlush(ctx: CustomerImportContext) {
  // First flush companies to ensure they exist
  await ctx.companyProcessor.flush();

  // Then flush addresses and customers
  await ctx.prisma.$transaction(async (tx) => {
    await ctx.addressProcessor.flush(tx);
    await ctx.customerProcessor.flush(tx);
  });

  // Process contact info in smaller batches
  const CONTACT_BATCH_SIZE = 25; // Process 25 customers' contact info at a time
  const pendingCustomers = Array.from(ctx.pendingContactInfo.entries());
  
  for (let i = 0; i < pendingCustomers.length; i += CONTACT_BATCH_SIZE) {
    const batch = pendingCustomers.slice(i, i + CONTACT_BATCH_SIZE);
    
    // Process this batch of customers' contact info
    for (const [quickbooksId, contactInfo] of batch) {
      const customerId = ctx.customerProcessor.getCustomerId(quickbooksId);
      if (!customerId) {
        if (ctx.debug) console.log(`Warning: No customer ID found for QB ID ${quickbooksId}`);
        continue;
      }

      // Process emails
      for (const { email, isPrimary } of contactInfo.emails) {
        await ctx.emailProcessor.add({
          email,
          type: 'MAIN' as const,
          isPrimary,
          customerId
        });
      }

      // Process phones
      for (const { number, type, isPrimary } of contactInfo.phones) {
        await ctx.phoneProcessor.add({
          phone: number,
          type,
          isPrimary,
          customerId
        });
      }
    }

    // Flush this batch's contact info
    await ctx.prisma.$transaction(async (tx) => {
      await ctx.emailProcessor.flush(tx);
      await ctx.phoneProcessor.flush(tx);
    });

    if (ctx.debug) {
      console.log(`Processed contact info for customers ${i + 1} to ${Math.min(i + CONTACT_BATCH_SIZE, pendingCustomers.length)}`);
    }
  }

  // Clear pending contact info after all batches are processed
  ctx.pendingContactInfo.clear();
}

setupImportCommand(
  'import-customer',
  'Import customer data from QuickBooks CSV export',
  importCustomers
);
