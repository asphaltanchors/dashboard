# System Architecture Patterns

## Report Filter Pattern
1. Component Architecture
   - ReportHeader: Container component for all filters
   - DateRangeFilter: Preset-based date selection
   - AmountFilter: Range-based amount filtering
   - All filters maintain URL state

2. State Management
   - URL Parameters
     * date_range: Preset identifier
     * amount_min: Lower bound
     * amount_max: Upper bound
     * Shareable and bookmarkable state
   
3. Data Flow
   - URL parameters drive initial state
   - Filter changes update URL
   - Server components read URL state
   - Data fetching respects filter state

4. Filter Persistence
   - Phase 1: URL-based only
   - Phase 2: Cross-page state management
   - Phase 3: Saved preferences (future)

## Server-Side Rendering Pattern
1. Data Fetching
   - Server components for data operations
   - Prisma queries in library functions
   - URL-based state management
   - Type-safe response handling

2. Component Architecture
   - Server components by default
   - Client components only when needed
   - Hybrid approach for interactive elements
   - Props-based configuration

3. State Management
   - URL parameters for shareable state
   - Server actions for mutations
   - Minimal client-side state
   - Optimistic updates where beneficial

## Multi-Source Enrichment Pattern
1. Data Model
   - Source-specific enrichment records
   - Version tracking
   - Conflict resolution
   - Quality metrics

2. Source Management
   - Source priority system
   - Fallback handling
   - Data freshness tracking
   - Source reliability metrics

3. Data Flow
   - Multi-source querying
   - Data merging logic
   - Conflict resolution
   - Update propagation

4. Error Handling
   - Source-specific errors
   - Fallback procedures
   - Data quality validation
   - User feedback

## Report Generation Pattern
1. Data Processing
   - Server-side aggregation
   - Efficient database queries
   - Caching where appropriate
   - Type-safe transformations

2. Visualization Components
   - Reusable chart components
   - Consistent styling patterns
   - Interactive filtering
   - Responsive layouts

3. State Management
   - URL-based time periods
   - Server-side calculations
   - Client-side interactivity
   - Efficient updates

## Data Import Pattern
1. Processing Flow
   - Validation first
   - Batch processing
   - Transaction management
   - Status tracking

2. Error Handling
   - Detailed error capture
   - User-friendly messages
   - Recovery mechanisms
   - Logging and monitoring

3. Performance
   - Optimized batch sizes
   - Efficient database operations
   - Progress tracking
   - Resource management

## Performance Optimization Pattern
1. Database Layer
   - Efficient query patterns
   - Strategic indexing
   - Connection pooling
   - Transaction optimization

2. Server Layer
   - Server-side rendering
   - Efficient data fetching
   - Response caching
   - Resource optimization

3. Client Layer
   - Minimal JavaScript
   - Strategic component splitting
   - Efficient re-rendering
   - Asset optimization

## Component Design Pattern
1. Hierarchy
   - Page components
   - Feature components
   - UI components
   - Utility components

2. Data Flow
   - Props down
   - Events up
   - Server actions for mutations
   - Type-safe interfaces

3. Styling
   - TailwindCSS utilities
   - Consistent spacing
   - Responsive design
   - Accessibility focus

4. Table Components
   - Base patterns:
     * Static tables for simple data display
     * Server tables for complex data handling
   - ServerOrdersTable configuration:
     * Customizable fetch function
     * URL parameter preservation
     * Configurable columns and rendering
     * Default sort preferences
     * Search and pagination controls
   - Implementation:
     ```typescript
     interface ServerOrdersTableProps {
       initialOrders: TableData
       fetchOrders: (params: FetchParams) => Promise<TableData>
       preserveParams?: string[]  // URL params to preserve
       title?: string
       columns?: Column[]
       defaultSort?: { column: keyof Order; direction: 'asc' | 'desc' }
       pageSize?: number
       searchPlaceholder?: string
     }
     ```
   - Usage examples:
     * Regular orders: `preserveParams={['filter']}`
     * Canadian orders: `preserveParams={['date_range', 'min_amount', 'max_amount']}`

## Error Handling Pattern
1. Layer-specific Handling
   - Database: Prisma errors
   - Server: HTTP responses
   - Client: User feedback
   - API: External service errors

2. User Experience
   - Clear error messages
   - Recovery options
   - Status feedback
   - Graceful degradation

3. Implementation
   - Type-safe error objects
   - Consistent error structure
   - Proper error propagation
   - Logging and monitoring
