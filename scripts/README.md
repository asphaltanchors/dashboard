# Import Scripts

This directory contains TypeScript scripts for importing data from QuickBooks CSV exports into the database. The scripts use `tsx` (via `pnpx`) to execute TypeScript files directly without a separate compilation step.

## Available Scripts

### Sales Receipt Import
```bash
pnpx tsx --expose-gc scripts/import-salesreceipt.ts <file> [options]
```

Options:
- `-d, --debug`: Enable debug logging
- `-s, --skip-lines <number>`: Skip first N lines of CSV file after header

### Invoice Import
```bash
pnpx tsx --expose-gc scripts/import-invoice.ts <file> [options]
```

Options:
- `-d, --debug`: Enable debug logging

### Customer Import
```bash
pnpx tsx --expose-gc scripts/import-customer.ts <file> [options]
```

Options:
- `-d, --debug`: Enable debug logging

## Prerequisites

- pnpm installed (the project uses pnpm for package management)
- Node.js 16 or higher
- Database connection configured in environment

## Memory Management

### Node.js Runtime Flags with tsx

The `--expose-gc` flag is a Node.js runtime flag that enables manual garbage collection. It must come BEFORE the script name because it configures how Node.js itself runs:

```bash
pnpx tsx [runtime flags] script.ts [script arguments]
```

For example:
```bash
# Correct:
pnpx tsx --expose-gc scripts/import-salesreceipt.ts --debug

# Incorrect:
pnpx tsx scripts/import-salesreceipt.ts --expose-gc --debug
```

Other useful Node.js runtime flags:
- `--max-old-space-size=4096`: Increase memory limit to 4GB
- `--trace-gc`: Log when garbage collection occurs

You can combine multiple runtime flags:
```bash
pnpx tsx --expose-gc --max-old-space-size=4096 scripts/import-salesreceipt.ts
```

### Memory Usage

The import scripts are designed to handle large datasets efficiently by:
- Processing records in batches
- Cleaning up resources after each batch
- Using manual garbage collection at strategic points

If you encounter memory issues:
1. Enable garbage collection with `--expose-gc`
2. Increase memory limit if needed with `--max-old-space-size`
3. Use debug mode (`-d`) to monitor processing
4. For sales receipts, use `-s` to skip problematic rows if needed

## CSV File Requirements

### Sales Receipt Import
- Required columns:
  - QuickBooks Internal Id
  - Sales Receipt No
  - Customer
  - Total Amount
  - Product/Service details

### Invoice Import
- Required columns:
  - QuickBooks Internal Id
  - Invoice No
  - Customer
  - Total Amount
  - Product/Service details

### Customer Import
- Required columns:
  - QuickBooks Internal Id
  - Customer Name
  - Status
  - Address details
  - Contact information

## Examples

Import sales receipts with debug logging:
```bash
pnpx tsx --expose-gc scripts/import-salesreceipt.ts data.csv -d
```

Import invoices with increased memory:
```bash
pnpx tsx --expose-gc --max-old-space-size=4096 scripts/import-invoice.ts data.csv
```

Skip first 100 rows in sales receipt import:
```bash
pnpx tsx --expose-gc scripts/import-salesreceipt.ts data.csv -s 100
```

## Troubleshooting

1. Random failures with large datasets:
   - Ensure you're using the `--expose-gc` flag
   - Try increasing memory with `--max-old-space-size`
   - Use debug mode to identify where failures occur

2. Import seems stuck:
   - Use debug mode (-d) to see detailed progress
   - Check CPU and memory usage
   - Consider processing in smaller batches

3. Data validation errors:
   - Check CSV format matches requirements
   - Look for special characters or encoding issues
   - Verify required columns are present

4. Memory leaks:
   - The scripts implement automatic cleanup
   - Manual garbage collection is triggered at strategic points
   - Monitor memory usage with debug mode
