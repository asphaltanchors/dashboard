import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"

interface EnrichmentResponse {
  success: boolean
  error?: string
}

/**
 * Filter out unwanted fields from the Coresignal API response
 * @param data The original API response data
 * @returns Filtered data with unwanted fields removed
 */
function filterEnrichmentData(data: Record<string, any>): Record<string, any> {
  // Create a new object to hold the filtered data
  const filteredData: Record<string, any> = {};
  
  // Fields to exclude (exact matches and pattern matches)
  const excludeExact = ['key_employee_change_events', 'active_job_postings_titles', 'top_previous_companies', 'technologies_used', 'key_executives', 'additional_pay', 'base_salary', 'total_salary', 'linkedin_followers_count_by_month', 'active_job_postings_count_by_month'];
  const excludePatterns = ['visits_breakdown_', 'key_executive_', 'employees_count_', 'employee_reviews_'];
  
  // Copy only the fields we want to keep
  for (const [key, value] of Object.entries(data)) {
    // Skip if the key is in the exact exclude list
    if (excludeExact.includes(key)) {
      continue;
    }
    
    // Skip if the key matches any of the exclude patterns
    if (excludePatterns.some(pattern => key.startsWith(pattern))) {
      continue;
    }
    
    // Keep this field
    filteredData[key] = value;
  }
  
  return filteredData;
}

export async function enrichCompany(domain: string): Promise<EnrichmentResponse> {
  const apiToken = process.env.CORESIGNAL_KEY
  if (!apiToken) {
    return {
      success: false,
      error: "Coresignal API token not configured"
    }
  }

  try {
    // Make API request to Coresignal
    const response = await fetch(
      `https://api.coresignal.com/cdapi/v1/multi_source/company/enrich?website=${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      // Check if this is a "company not found" error (typically 404)
      const isCompanyNotFound = response.status === 404;
      
      // For "company not found" errors, mark as enriched but with empty data
      // This prevents repeated attempts to enrich a company that doesn't exist
      if (isCompanyNotFound) {
        await prisma.company.update({
          where: { domain },
          data: {
            enriched: true, // Mark as enriched so we don't try again
            enrichedAt: new Date(),
            enrichedSource: 'coresignal.com',
            enrichmentData: { notFound: true }, // Store minimal data
            enrichmentError: 'Company not found in Coresignal API'
          }
        });
        return {
          success: true, // Consider this a "success" for reporting purposes
          error: 'Company not found but marked as processed'
        };
      }
      
      // Handle other types of failed enrichment by updating record with error info
      await prisma.company.update({
        where: { domain },
        data: {
          enriched: false,
          enrichedAt: new Date(),
          enrichedSource: 'coresignal.com',
          enrichmentData: Prisma.JsonNull,
          enrichmentError: `API request failed: ${response.statusText}`
        }
      });
      return {
        success: false,
        error: `API request failed: ${response.statusText}`
      };
    }

    const rawEnrichmentData = await response.json()
    
    // Filter out unwanted fields before storing
    const filteredEnrichmentData = filterEnrichmentData(rawEnrichmentData);

    // Update company record with successful enrichment
    await prisma.company.update({
      where: { domain },
      data: {
        enriched: true,
        enrichedAt: new Date(),
        enrichedSource: 'coresignal.com',
        enrichmentData: filteredEnrichmentData,
        enrichmentError: null,
        // Update company name if available in enrichment data
        // Note: This path may need to be adjusted based on Coresignal's actual response structure
        name: filteredEnrichmentData.name || filteredEnrichmentData.company_name || undefined
      }
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Enrichment failed:', errorMessage)
    
    // Update company record with error info even for unexpected errors
    await prisma.company.update({
      where: { domain },
      data: {
        enriched: false,
        enrichedAt: new Date(),
        enrichedSource: 'coresignal.com',
        enrichmentData: Prisma.JsonNull,
        enrichmentError: errorMessage
      }
    })

    return {
      success: false,
      error: errorMessage
    }
  }
}
