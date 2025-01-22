#!/usr/bin/env node
import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { ImportConfig, ImportConfigSchema, ImportResult, DailyImportLog } from './shared/import-config';

const prisma = new PrismaClient();

async function ensureDirectoryExists(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function moveFile(source: string, destDir: string): Promise<string> {
  const filename = path.basename(source);
  const destination = path.join(destDir, filename);
  await fs.rename(source, destination);
  return destination;
}

async function cleanupOldFiles(directory: string, retentionDays: number) {
  const files = await fs.readdir(directory);
  const now = new Date();
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = await fs.stat(filePath);
    const ageInDays = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > retentionDays) {
      await fs.unlink(filePath);
    }
  }
}

async function writeImportLog(config: ImportConfig, log: DailyImportLog) {
  const logPath = path.join(config.logDir, `import_${log.date}.json`);
  await fs.writeFile(logPath, JSON.stringify(log, null, 2));
}

async function importFile(
  filePath: string,
  importType: 'customers' | 'invoices' | 'salesReceipts',
  config: ImportConfig
): Promise<ImportResult> {
  const startTime = new Date();
  const result: ImportResult = {
    filename: path.basename(filePath),
    importType,
    success: false,
    startTime,
    endTime: startTime,
    recordsProcessed: 0,
    errors: [],
    warnings: []
  };

  try {
    // Import the appropriate processor based on type
    let importFn;
    switch (importType) {
      case 'customers':
        const { importCustomers } = await import('./import-customer');
        importFn = importCustomers;
        break;
      case 'invoices':
        const { importInvoices } = await import('./import-invoice');
        importFn = importInvoices;
        break;
      case 'salesReceipts':
        const { importSalesReceipts } = await import('./import-salesreceipt');
        importFn = importSalesReceipts;
        break;
    }

    // Run the import with options
    await importFn(filePath, config.debug, { skipLines: 0 });
    
    result.success = true;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  result.endTime = new Date();
  return result;
}

async function processImports(configPath: string) {
  // Load and validate config
  const configFile = await fs.readFile(configPath, 'utf-8');
  const config = ImportConfigSchema.parse(JSON.parse(configFile));

  // Ensure required directories exist
  await Promise.all([
    ensureDirectoryExists(config.importDir),
    ensureDirectoryExists(config.archiveDir),
    ensureDirectoryExists(config.failedDir),
    ensureDirectoryExists(config.logDir)
  ]);

  // Initialize daily log
  const today = new Date().toISOString().split('T')[0];
  const dailyLog: DailyImportLog = {
    date: today,
    imports: [],
    archiveDir: config.archiveDir
  };

  // Process each import type
  const importTypes = ['customers', 'invoices', 'salesReceipts'] as const;
  
  for (const importType of importTypes) {
    const pattern = config.filePatterns[importType];
    const files = await fs.readdir(config.importDir);
    
    // Find matching files from last 24 hours
    const recentFiles = await Promise.all(
      files
        .filter(f => f.match(pattern.replace('*', '\\d{8}')))
        .map(async f => {
          const filePath = path.join(config.importDir, f);
          const stats = await fs.stat(filePath);
          return { path: filePath, stats };
        })
    );

    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const filesToProcess = recentFiles
      .filter(f => f.stats.mtime.getTime() > last24Hours)
      .map(f => f.path);

    // Process each file
    for (const filePath of filesToProcess) {
      const result = await importFile(filePath, importType, config);
      dailyLog.imports.push(result);

      // Move file based on result
      const targetDir = result.success ? config.archiveDir : config.failedDir;
      await moveFile(filePath, targetDir);
    }
  }

  // Write daily log
  await writeImportLog(config, dailyLog);

  // Cleanup old files
  await cleanupOldFiles(config.archiveDir, config.retentionDays);
  await cleanupOldFiles(config.logDir, config.retentionDays);

  // Output summary
  console.log(`Import Summary for ${today}:`);
  console.log(`Total files processed: ${dailyLog.imports.length}`);
  console.log(`Successful imports: ${dailyLog.imports.filter(i => i.success).length}`);
  console.log(`Failed imports: ${dailyLog.imports.filter(i => !i.success).length}`);

  if (dailyLog.imports.some(i => !i.success)) {
    process.exit(1);
  }
}

// Setup CLI
const program = new Command();

program
  .name('process-daily-imports')
  .description('Process daily CSV imports for customers, invoices, and sales receipts')
  .argument('<config>', 'Path to config file')
  .action(async (configPath: string) => {
    try {
      await processImports(configPath);
    } catch (error) {
      console.error('Import failed:', error);
      process.exit(1);
    }
  });

program.parse();
