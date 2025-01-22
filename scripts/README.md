# Import Scripts

This directory contains scripts for importing data from various sources.

## Daily Import Process

The `process-daily-imports.ts` script handles automated daily imports of customer, invoice, and sales receipt data. It processes CSV files that are generated daily and maintains a history of imports.

### Configuration

Create a configuration file (e.g., `import-config.json`) with the following structure:

```json
{
  "importDir": "/path/to/import/directory",
  "archiveDir": "/path/to/archive/directory",
  "failedDir": "/path/to/failed/directory",
  "logDir": "/path/to/log/directory",
  
  "filePatterns": {
    "customers": "Customer_\\d{2}_\\d{2}_\\d{4}_\\d{1,2}_\\d{2}_\\d{2}.csv",
    "invoices": "Invoice_\\d{2}_\\d{2}_\\d{4}_\\d{1,2}_\\d{2}_\\d{2}.csv",
    "salesReceipts": "Sales Receipt_\\d{2}_\\d{2}_\\d{4}_\\d{1,2}_\\d{2}_\\d{2}.csv"
  },
  
  "retentionDays": 30,
  "batchSize": 100,
  "maxRetries": 3,
  "debug": false
}
```

### File Naming Convention

Files should follow these naming patterns:
- Customers: `Customer_MM_DD_YYYY_H_MM_SS.csv` (e.g., `Customer_01_20_2025_1_00_02.csv`)
- Invoices: `Invoice_MM_DD_YYYY_H_MM_SS.csv` (e.g., `Invoice_01_20_2025_1_00_02.csv`)
- Sales Receipts: `Sales Receipt_MM_DD_YYYY_H_MM_SS.csv` (e.g., `Sales Receipt_01_20_2025_1_00_02.csv`)

### Directory Structure

- `importDir`: Where new CSV files are placed
- `archiveDir`: Successfully processed files are moved here
- `failedDir`: Files that failed to process are moved here
- `logDir`: Import logs are stored here

### Running the Import

```bash
# Run manually
node dist/scripts/process-daily-imports.js /path/to/import-config.json

# Setup cron job (runs at 2 AM daily)
0 2 * * * cd /path/to/project && /usr/local/bin/node dist/scripts/process-daily-imports.js /path/to/import-config.json
```

### Import Process

1. Scans import directory for files matching patterns
2. Processes files modified in the last 24 hours
3. For each file:
   - Validates CSV format
   - Imports data using appropriate processor
   - Moves file to archive or failed directory
4. Generates import log with results
5. Cleans up old files based on retention policy

### Logging

Import logs are stored in JSON format with the following information:
- Date of import
- Files processed
- Success/failure status
- Error messages
- Import statistics

### Error Handling

- Failed imports don't stop the entire process
- Files that fail to import are moved to the failed directory
- Detailed error logs are generated
- Process exits with code 1 if any imports fail

### Individual Import Scripts

The following scripts can also be run individually:

- `import-customer.ts`: Import customer data
- `import-invoice.ts`: Import invoice data
- `import-salesreceipt.ts`: Import sales receipt data

Each script accepts these options:
- `-d, --debug`: Enable debug logging
- `-s, --skip-lines <number>`: Skip first N lines of CSV file

Example:
```bash
node dist/scripts/import-customer.js customers.csv --debug
```
