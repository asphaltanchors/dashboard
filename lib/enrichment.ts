import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"
import { NormalizedRevenue } from "@/types/enrichment"

interface EnrichmentResponse {
  success: boolean
  error?: string
}

/**
 * Extract and normalize revenue data from various possible sources in the enrichment data
 * @param data The enrichment data object
 * @returns Normalized revenue data or null if no revenue data is found
 */
export function extractAndNormalizeRevenue(data: Record<string, unknown>): NormalizedRevenue | null {
  try {
    // Check all possible revenue sources and consolidate into a single normalized format
    
    // 1. Check source_5_annual_revenue (exact revenue)
    if (data.revenue_annual && 
        typeof data.revenue_annual === 'object' && 
        data.revenue_annual !== null &&
        'source_5_annual_revenue' in data.revenue_annual &&
        typeof data.revenue_annual.source_5_annual_revenue === 'object' &&
        data.revenue_annual.source_5_annual_revenue !== null &&
        'annual_revenue' in data.revenue_annual.source_5_annual_revenue) {
      
      const revenueSource = data.revenue_annual.source_5_annual_revenue as Record<string, any>;
      const revenue = Number(revenueSource.annual_revenue);
      const currency = revenueSource.annual_revenue_currency || '$';
      
      if (!isNaN(revenue)) {
        return {
          exact: revenue,
          currency,
          range: formatRevenueRange(revenue),
          source: 'source_5_annual_revenue'
        };
      }
    }
    
    // 2. Check revenue_annual_range (could be string or object with from/to)
    if (data.revenue_annual_range) {
      // If it's a string (e.g. "$1M-$10M")
      if (typeof data.revenue_annual_range === 'string') {
        return {
          range: data.revenue_annual_range as string,
          source: 'revenue_annual_range_string'
        };
      }
      
      // If it's an object with sources
      if (typeof data.revenue_annual_range === 'object' && data.revenue_annual_range !== null) {
        // Try each source
        for (const [source, info] of Object.entries(data.revenue_annual_range as Record<string, any>)) {
          if (!info) continue;
          
          const from = info.annual_revenue_range_from;
          const to = info.annual_revenue_range_to;
          const currency = info.annual_revenue_range_currency || '$';
          
          if (from || to) {
            return {
              min: from ? Number(from) : undefined,
              max: to ? Number(to) : undefined,
              currency,
              range: formatRevenueRangeFromMinMax(from, to, currency),
              source
            };
          }
        }
      }
    }
    
    // 3. Check for any other revenue fields that might exist
    // Add more checks based on the actual data structure if needed
    
    return null;
  } catch (error) {
    console.error("Error normalizing revenue:", error);
    return null;
  }
}

/**
 * Format a revenue value into a human-readable range
 */
function formatRevenueRange(value: number, currency: string = '$'): string {
  if (value < 1000000) return `${currency}0-${currency}1M`;
  if (value < 10000000) return `${currency}1M-${currency}10M`;
  if (value < 100000000) return `${currency}10M-${currency}100M`;
  if (value < 1000000000) return `${currency}100M-${currency}1B`;
  return `${currency}1B+`;
}

/**
 * Format a revenue range from min/max values
 */
function formatRevenueRangeFromMinMax(min?: number, max?: number, currency: string = '$'): string {
  if (min && max) {
    return `${currency}${formatMillions(min)}-${currency}${formatMillions(max)}`;
  } else if (min) {
    return `${currency}${formatMillions(min)}+`;
  } else if (max) {
    return `Up to ${currency}${formatMillions(max)}`;
  }
  return 'Unknown';
}

/**
 * Format a number in millions or billions
 */
function formatMillions(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)}M`;
  }
  return `${(value / 1000).toFixed(0)}K`;
}

/**
 * Filter out unwanted fields from the Coresignal API response
 * @param data The original API response data
 * @returns Filtered data with unwanted fields removed
 */
function filterEnrichmentData(data: Record<string, unknown>): Record<string, unknown> {
  // Create a new object to hold the filtered data
  const filteredData: Record<string, unknown> = {};
  
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
  
  // Add normalized revenue data
  const normalizedRevenue = extractAndNormalizeRevenue(data);
  if (normalizedRevenue) {
    filteredData.normalized_revenue = normalizedRevenue;
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
        enrichmentData: filteredEnrichmentData as Prisma.InputJsonValue,
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
