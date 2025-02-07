# AACD Dashboard

A comprehensive dashboard for managing AACD's business operations, including customer management, order tracking, and reporting.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- Docker
- Kamal (Deployment)

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL

### Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd aacd
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your database connection in `.env`:
```bash
DATABASE_URL="postgresql://[user]:[password]@localhost:5432/aacd"
```

5. Set up the database:
```bash
npx prisma migrate dev
```

6. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Production Deployment

This project uses [Kamal](https://kamal-deploy.org/) for zero-downtime deployments to production.

### Prerequisites

- Docker
- Kamal CLI (`gem install kamal`)
- SSH access to production server
- Docker Hub access

### Production Deployment

Deploy to production using Kamal:
```bash
kamal setup -e production    # First time only
kamal deploy -e production
```

### Deployment Configuration

Deployment settings are managed in `config/deploy.yml`. Key configurations include:

- Service name and registry settings
- Environment variables
- Health check endpoints
- SSL/TLS settings
- Database configurations

### Monitoring Deployments

Monitor deployment status:
```bash
kamal status
```

View application logs:
```bash
kamal app logs
```

### Rolling Back

If needed, roll back to the previous version:
```bash
kamal rollback
```

## Database Management

### Database Setup

#### Development Environment

1. Run migrations:
```bash
npx prisma migrate dev
```

2. Execute required SQL setup:
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

#### Production Environment

Database migrations are handled automatically during the Docker build process. However, you still need to execute the following SQL setup once:

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

Note: This SQL setup is required only once when setting up a new environment.

## Additional Documentation

For more detailed documentation about specific aspects of the application, see:

- [Product Context](cline_docs/productContext.md)
- [System Patterns](cline_docs/systemPatterns.md)
- [Technical Context](cline_docs/techContext.md)
