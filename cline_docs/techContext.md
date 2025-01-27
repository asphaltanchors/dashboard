# API Dependencies

## The Companies API
- Base URL: https://api.thecompaniesapi.com/v2
- Authentication: Bearer token via COMPANIES_API_KEY environment variable
- Used for: Company data enrichment
- Endpoints:
  - GET /companies/{domain} - Fetch company information by domain

# Environment Variables

Required environment variables:
- COMPANIES_API_KEY: API key for thecompaniesapi.com
- DATABASE_URL: PostgreSQL connection string

# Database Schema Updates

## Company Table
- enriched: Boolean (default: false)
- enrichedAt: DateTime (nullable)
- enrichedSource: String (nullable)
- enrichmentData: Json (nullable)

# UI Components

## Client Components
- Located in app/providers.tsx
- Wraps client-side providers (Toast, Sidebar)
- Keeps root layout as server component

## Toast Notifications
- Located in components/ui/use-toast.tsx (client component)
- Provider wrapped in Providers component
- Used for: Showing success/error messages for async operations
- Auto-dismisses after 3 seconds

## Company Components
- EnrichButton: Client component for bulk enrichment from companies list
- SingleEnrichButton: Client component for individual company enrichment
- Both components handle:
  - Loading states
  - Error feedback via toast
  - Disabled states when enriched
  - Auto-refresh after success
