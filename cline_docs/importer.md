# Customer Import Specification

## Overview
This document provides complete context for implementing a QuickBooks customer data import feature. The import process takes a CSV export from QuickBooks and creates/updates customer records in our database.

## Key Requirements
- Import must be idempotent using QuickBooks Internal Id as unique identifier
- Store complete source data as JSON
- Handle all customer-related entities (addresses, phones, emails, etc.)
- Create companies based on email domains found in the data
- CLI tool with transaction support and debug logging

## Data Processing Rules

### Customer Records
- Unique identifier: QuickBooks Internal Id field
- Create one customer record per CSV row
- Store complete raw CSV row as JSON in sourceData field
- Status values:
  - Convert "true" to "ACTIVE"
  - Convert "false" to "INACTIVE"
  - Log warning for other values

### Company Records
- Create companies based on email domains
- Multiple emails should be split on semicolon
- Extract domain from each email address
- Skip company creation if no valid domain found
- Company name from CSV preserved as-is (case-sensitive)

### Contact Information
1. Phones
   - Use existing PhoneType enum
   - Format standardization:
     - Keep extensions: " x1234" (space, lowercase x, number)
     - Keep hyphens and + for readability
     - Strip parentheses
     - Example: "+1-555-123-4567 x1234"
   - Store country codes as part of phone string

2. Emails
   - Split multiple emails on semicolon
   - Store without validation
   - Create separate records for CC emails
   - Use EmailType enum (MAIN/CC)

### Address Handling
- Create Address records if at least line1 is present
- City/state not required, even for US addresses
- Store addresses as-is without standardization
- Create separate billing/shipping addresses

### Name Handling
- Store First/Middle/Last names separately
- Preserve case-sensitive prefixes/suffixes (e.g., "III", "von")
- Capitalize first letter of each name part

## Technical Implementation

### Process Flow
1. Parse CSV file
2. For each row:
   - Extract and validate QuickBooks ID
   - Process/standardize data
   - Extract and process email domains
   - Upsert Company if domain found
   - Upsert Customer
   - Create/update related records (addresses, phones, emails)
3. Commit transaction

### Error Handling
- Fail entire import on validation errors
- Transaction rollback on failure
- Detailed error messages for validation failures

### Debug Output (--debug flag)
Fields to log:
- QuickBooks ID
- Customer/Company name
- Action taken (create/update)
- Warnings/issues encountered

Statistics to track:
- Records processed
- Companies created
- Customers created/updated
- Warnings/issues count

### Date Handling
- Validate date formats
- Store in US East timezone
- Timezone precision not critical


## Schema Notes
The Prisma schema provides these key models:
- Customer (with quickbooksId)
- Company (with domain as unique identifier)
- CustomerEmail (with type enum)
- CustomerPhone (with type enum)
- Address (for billing/shipping)

## Implementation Checklist
1. [ ] Set up CLI tool structure with debug flag
2. [ ] Implement CSV parsing
3. [ ] Create data transformation functions
4. [ ] Implement company domain extraction
5. [ ] Create database transaction wrapper
6. [ ] Implement main import logic
7. [ ] Add error handling and validation
8. [ ] Add logging and statistics
9. [ ] Create tests
10. [ ] Document usage


