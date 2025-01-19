# System Patterns

## Architecture Overview
The application follows a modern Next.js architecture with clear separation of concerns:

### Data Layer
1. Prisma Schema
   - Models for business entities
   - Relationships between entities
   - Database migrations

2. Data Import
   - CSV parsing utilities
   - QuickBooks data mapping
   - Data validation and transformation

### Application Layer
1. API Routes
   - RESTful endpoints for data operations
   - CSV upload handling
   - Report generation

2. Business Logic
   - Data aggregation
   - Metric calculations
   - Report generation logic

### Presentation Layer
1. Dashboard Layout
   - Responsive grid system
   - Report card components
   - Navigation structure

2. Components
   - Reusable UI components
   - Data visualization components
   - Form components for data import

## Key Technical Decisions
1. App Router Usage
   - Server components for improved performance
   - API routes for data operations
   - Static and dynamic rendering where appropriate

2. Database Operations
   - Prisma for type-safe database access
   - Structured migrations
   - Efficient querying patterns

3. Data Import Strategy
   - CSV file upload
   - Background processing
   - Validation and error handling

## Code Organization
1. Feature-based Structure
   - Separate concerns by business domain
   - Shared components in /components
   - Utilities in /lib

2. Data Flow
   - Unidirectional data flow
   - Server-side data fetching
   - Client-side state management when needed

3. Error Handling
   - Consistent error patterns
   - User-friendly error messages
   - Logging and monitoring
