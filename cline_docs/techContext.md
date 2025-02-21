# API Dependencies

[Previous API sections remain unchanged...]

# Component Structure

## Report Filter Components
1. ReportHeader (Server Component)
   - Container for all report filters
   - Handles URL parameter parsing
   - Manages filter state coordination
   - Layout and positioning

2. DateRangeFilter (Client Component)
   - Preset options dropdown
   - Options: 7, 30, 60, 90, 180, 365 days
   - Updates URL on selection
   - Reset functionality

3. AmountFilter (Client Component)
   Phase 1:
   - Simple min/max inputs
   - Basic validation
   - URL parameter integration
   
   Phase 2:
   - Transaction histogram
   - Range slider
   - Preset ranges
   - Custom range inputs

4. Shared Functionality
   - URL parameter management
   - Reset handling
   - Loading states
   - Error boundaries

## URL Parameter Structure
- date_range: string (e.g., "7d", "30d")
- amount_min: number
- amount_max: number
- Default values handled server-side

## State Management
Phase 1:
- URL-based state only
- Server-side parameter parsing
- Client-side URL updates

Phase 2:
- Cross-page state persistence
- Loading state handling
- Error state management

[Rest of the file remains unchanged...]
