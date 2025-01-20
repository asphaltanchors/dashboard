# Technical Context

## Technology Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- React Components
- Shadcn UI Components

### Backend
- Next.js API Routes
- Prisma ORM
- PostgreSQL Database
- CSV Processing System

### Development Tools
- ESLint
- PostCSS
- TypeScript Configuration
- Prisma Studio

## Project Structure
```
/app                - Next.js app router pages
/components        - Reusable React components
  /ui             - Shadcn UI components
  /customers      - Customer-related components
  /companies      - Company-related components
  /dashboard      - Dashboard components
/lib               - Utility functions and data access
/prisma            - Database schema and migrations
/scripts           - Import and processing scripts
  /processors     - Data processing logic
  /shared         - Shared types and utilities
/types             - TypeScript type definitions
/public            - Static assets
```

## Key Dependencies
- Next.js 15
- Prisma ORM
- PostgreSQL
- TailwindCSS
- TypeScript
- Shadcn UI

## Development Setup
1. Node.js environment
2. PostgreSQL database
3. Environment variables configuration
4. Prisma database migrations
5. Local development server

## Technical Requirements
1. TypeScript for type safety
2. Prisma for database operations
3. CSV parsing for QuickBooks data
4. Data visualization (pending selection)
5. Company data enrichment capabilities
6. Batch processing system
