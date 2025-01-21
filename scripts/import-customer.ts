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
    private batchSize: number = DEFAULT_BATCH_SIZE,
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

    // Filter out records that don't exist yet
    const newRecords = records.filter(record => !this.existingDomains.has(record.domain));
    
    if (newRecords.length > 0) {
      // Use createMany for bulk insertion
      await this.prisma.company.createMany({
        data: newRecords,
        skipDuplicates: true
      });

      // Update stats
      if (this.stats) {
        this.stats.companiesCreated += newRecords.length;
      }

      // Add new domains to our set
      for (const record of newRecords) {
        this.existingDomains.add(record.domain);
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

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    // First find any existing addresses
    const existingAddresses = await this.prisma.address.findMany({
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
      const result = await this.prisma.address.createMany({
        data: newAddresses.map(({ hash, ...addressData }) => addressData),
        skipDuplicates: true
      });

      if (result.count > 0) {
        // Fetch the newly created addresses to get their IDs
        const createdAddresses = await this.prisma.address.findMany({
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

    await this.prisma.$transaction(async (tx) => {
      // Handle creates
      if (creates.length > 0) {
        const result = await tx.customer.createMany({
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
        if (result.count > 0) {
          if (this.stats) {
            this.stats.customersCreated += result.count;
          }
          
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
      
      // Handle updates in bulk
      if (updates.length > 0) {
        // First get all customer IDs for the updates
        const existingCustomers = await tx.customer.findMany({
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
            return tx.customer.update({
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
    });

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
  });

  if (ctx.debug) {
    console.log(`Queued customer for processing: ${row['Customer Name']} (${quickbooksId})`);
  }

  stats.processed++;
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
    emailProcessor: new BatchEmailProcessor(prisma, DEFAULT_BATCH_SIZE),
    phoneProcessor: new BatchPhoneProcessor(prisma, DEFAULT_BATCH_SIZE),
    companyProcessor: new BatchCompanyProcessor(prisma, DEFAULT_BATCH_SIZE, stats),
    addressProcessor: new BatchAddressProcessor(prisma, DEFAULT_BATCH_SIZE, stats),
    customerProcessor: new BatchCustomerProcessor(prisma, DEFAULT_BATCH_SIZE, stats),
  };

  const parser = await createCsvParser(filePath);
  
  // First pass: Process companies, addresses, and customers
  const pendingContactInfo: Array<{
    quickbooksId: string;
    emails: Array<{ email: string; isPrimary: boolean }>;
    phones: Array<{ phone: string; type: PhoneType; isPrimary: boolean }>;
  }> = [];

  await processImport<CustomerRow>(ctx, parser, async (row) => {
    await processCustomerRow(ctx, row);
    
    // Store contact info for processing after customers are created
    const emails = [row['Main Email'], row['CC Email']]
      .filter(Boolean)
      .flatMap(e => e.split(';'))
      .map(e => e.trim())
      .filter(Boolean)
      .map((email, index) => ({
        email,
        isPrimary: index === 0
      }));
    
    const phones = [
      { number: row['Main Phone'], type: PhoneType.MAIN },
      { number: row['Mobile'], type: PhoneType.MOBILE },
      { number: row['Work Phone'], type: PhoneType.WORK },
      { number: row['Alt. Phone'], type: PhoneType.OTHER },
    ]
      .map(p => ({ ...p, number: formatPhone(p.number) }))
      .filter(p => p.number)
      .map((p, index) => ({
        phone: p.number,
        type: p.type,
        isPrimary: index === 0
      }));

    if (emails.length > 0 || phones.length > 0) {
      pendingContactInfo.push({
        quickbooksId: row['QuickBooks Internal Id'],
        emails,
        phones
      });
    }
  });

  // First flush companies, addresses, and customers
  await Promise.all([
    ctx.companyProcessor.flush(),
    ctx.addressProcessor.flush(),
    ctx.customerProcessor.flush()
  ]);

  // Second pass: Process contact info now that we have customer IDs
  for (const info of pendingContactInfo) {
    const customerId = ctx.customerProcessor.getCustomerId(info.quickbooksId);
    if (customerId) {
      // Queue emails
      for (const email of info.emails) {
        await ctx.emailProcessor.add({
          email: email.email,
          type: 'MAIN',
          isPrimary: email.isPrimary,
          customerId,
        });
      }
      
      // Queue phones
      for (const phone of info.phones) {
        await ctx.phoneProcessor.add({
          phone: phone.phone,
          type: phone.type,
          isPrimary: phone.isPrimary,
          customerId,
        });
      }
    }
  }

  // Finally flush contact info
  await Promise.all([
    ctx.emailProcessor.flush(),
    ctx.phoneProcessor.flush()
  ]);

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
