# Data Enrichment Pattern

## Core Principles
1. Separation of Concerns
   - Core logic in dedicated library files
   - Server actions for UI interactions
   - Client components for user feedback

2. Error Handling
   - Graceful API error handling
   - User-friendly error messages via toast
   - Type-safe error responses

3. State Management
   - Loading states for UI feedback
   - Automatic refresh after updates
   - Optimistic updates where possible

## Implementation Pattern
1. Library Layer (`lib/`)
   - Core business logic
   - API interactions
   - Database operations

2. Server Actions (`app/actions/`)
   - Bridge between UI and library
   - Handle server-side operations
   - Return structured responses

3. UI Components (`components/`)
   - Client-side interactivity
   - Loading states
   - Error handling
   - Success feedback

4. Data Flow
   - UI triggers server action
   - Server action calls library function
   - Library handles core logic
   - Results flow back up with proper error handling
