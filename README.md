# AAC Dashboard

A modern business intelligence dashboard for QuickBooks data visualization and analysis.

## Features

- 📊 Interactive data visualization
- 👥 Customer relationship management
- 🏢 Company data enrichment
- 📈 Order tracking and analysis
- 📱 Responsive design with Shadcn UI

## Tech Stack

- Next.js 15 (App Router)
- PostgreSQL + Prisma ORM
- TypeScript
- TailwindCSS + Shadcn UI

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Update DATABASE_URL and other required variables
```

3. Run database migrations:
```bash
pnpm prisma migrate dev
```

I do a weird thing with a postgres view that you need to manually create. Migations don't seem to currently (2025-01) handle views well.

```sql
CREATE OR REPLACE VIEW public."CompanyStats"
 AS
 SELECT c.id,
    count(DISTINCT cust.id) AS "customerCount",
    COALESCE(sum(o."totalAmount"), 0::numeric) AS "totalOrders"
   FROM "Company" c
     LEFT JOIN "Customer" cust ON cust."companyDomain" = c.domain
     LEFT JOIN "Order" o ON o."customerId" = cust.id
  GROUP BY c.id;
```

4. Start development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Data Import

The system supports importing QuickBooks data via CSV files:

- Customer records
- Company information
- Orders (Invoices and Sales Receipts)
- Products and line items

## Development Status

- Core infrastructure: 90% complete
- Data models: 85% complete
- UI components: 60% complete
- Import system: 40% complete
- Dashboard features: In progress

## Next Steps

- Deploy to production
    - Get Docker builds on GH action working
- Improve importing performance, reliability, error reporting
- Setup auto-importing for daily jobs
- Additional Reports
    - Popper Dropper
- Enrichment Jobs
    - enrich script
    - button to enrich specific company
    - update views to display enriched data
    - filters on enriched data

See [cline_docs/](./cline_docs/) for detailed documentation.
