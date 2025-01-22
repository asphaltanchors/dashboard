# System Patterns

## Architecture Overview
The application follows a modern Next.js architecture with clear separation of concerns:

### Data Layer
1. Prisma Schema
   - Complex entity relationships (Customer, Company, Order, Product)
   - Flexible address management system
   - Contact information modeling (emails, phones)
   - Rich metadata storage with JSON fields
   - Comprehensive indexing strategy

2. Data Import System
   - Specialized processors for different order types
   - Shared order processing utilities
   - Type-safe data transformation
   - Robust validation rules
   - Import statistics tracking

### Application Layer
1. Data Access Layer
   - Prisma Client integration
   - Type-safe database operations
   - Efficient query optimization
   - Connection pooling
   - Server Actions for data mutations
   - Centralized data fetching patterns

2. Business Logic
   - Order processing workflows
   - Customer relationship management
   - Company data enrichment
   - Metric calculations
   - Server-side data filtering and pagination

### Presentation Layer
1. UI Components
   - Shadcn UI integration
   - Server-side paginated data tables with Server Actions
   - URL-based state management
   - Debounced search and filtering
   - React useTransition for loading states
   - Scroll position preservation
   - Client components with server-side data fetching

2. Page Structure
   - App Router organization
   - Nested layouts
   - Dynamic routing
   - Error boundaries

## Key Technical Decisions
1. Database Design
   - PostgreSQL for complex relationships
   - JSON storage for flexible data
   - Strategic indexing for performance
   - Normalized address management
   - Efficient pagination queries
   - Case-insensitive search optimization

2. Type System
   - Comprehensive TypeScript coverage
   - Shared type definitions
   - Prisma-generated types
   - Import/Export type safety

3. Data Processing
   - Modular processor architecture
   - Shared utility functions
   - Standardized error handling
   - Import statistics tracking
   - Server-side data filtering
   - Paginated data fetching

## Code Organization
1. Feature Modules
   - Customer management
   - Company management
   - Order processing
   - Dashboard metrics

2. Shared Infrastructure
   - UI component library
   - Data access utilities
   - Type definitions
   - Processing utilities

3. Processing Pipeline
   - CSV parsing
   - Data validation
   - Entity creation/updates
   - Relationship management
