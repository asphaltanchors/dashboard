# Recent Changes

## Company Enrichment (2025-01-27)
- Added company enrichment functionality using thecompaniesapi.com
- Created core enrichment logic in `lib/enrichment.ts`
- Added "Enrich All" button to Companies dashboard
- Implemented toast notifications for feedback
- Set up for future batch processing capabilities

### Implementation Details
- API requests use COMPANIES_API_KEY environment variable
- Results stored in Company.enrichmentData (JSON field)
- Tracks enrichment status, time, and source
- UI shows loading states and error handling
- Auto-refreshes after successful enrichment

### Next Steps
- Create batch enrichment script
- Consider rate limiting for API requests
- Add enrichment data display to company details page

### Recent Updates (2025-01-27)
- Added individual company enrichment button to company details page
- Button shows loading state and disables when already enriched
- Added toast notifications for enrichment status
