import { z } from 'zod';

export const ImportConfigSchema = z.object({
  // Directory paths
  importDir: z.string(),
  archiveDir: z.string(),
  failedDir: z.string(),
  
  // File patterns for each import type
  filePatterns: z.object({
    customers: z.string().default('customers_*.csv'),
    invoices: z.string().default('invoices_*.csv'),
    salesReceipts: z.string().default('sales_receipts_*.csv')
  }),
  
  // How many days of history to keep in archive
  retentionDays: z.number().min(1).default(30),
  
  // Import settings
  batchSize: z.number().min(1).default(100),
  maxRetries: z.number().min(0).default(3),
  
  // Logging
  logDir: z.string(),
  debug: z.boolean().default(false)
});

export type ImportConfig = z.infer<typeof ImportConfigSchema>;

export interface ImportResult {
  filename: string;
  importType: 'customers' | 'invoices' | 'salesReceipts';
  success: boolean;
  startTime: Date;
  endTime: Date;
  recordsProcessed: number;
  errors: string[];
  warnings: string[];
}

export interface DailyImportLog {
  date: string;
  imports: ImportResult[];
  archiveDir: string;
}
