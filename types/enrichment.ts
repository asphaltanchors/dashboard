/**
 * Types for enrichment data used throughout the application
 */

/**
 * Raw enrichment data as received from external APIs
 */
export interface RawEnrichmentData {
  company_name?: string;
  company_legal_name?: string;
  categories_and_keywords?: string[];
  industry?: string;
  founded_year?: string;
  size_range?: string;
  employees_count?: number;
  twitter_url?: string[];
  facebook_url?: string[];
  linkedin_url?: string;
  revenue_annual_range?: RevenueRange;
  total_website_visits_monthly?: string | number;
  hq_city?: string;
  hq_state?: string;
  hq_country?: string;
  description_enriched?: string;
  description?: string;
  notFound?: boolean;
  [key: string]: unknown; // Allow for additional properties
}

/**
 * Processed enrichment data used in components
 */
export interface EnrichmentData {
  about?: {
    name?: string;
    industries?: string[];
    yearFounded?: number;
    totalEmployees?: string;
    totalEmployeesExact?: number;
  };
  socials?: {
    twitter?: { url: string };
    facebook?: { url: string };
    linkedin?: { url: string };
  };
  finances?: {
    revenue?: string;
  };
  analytics?: {
    monthlyVisitors?: string;
  };
  locations?: {
    headquarters?: {
      city?: { name: string };
      state?: { name: string };
      country?: { name: string };
    };
  };
  descriptions?: {
    primary?: string;
  };
  categories_and_keywords?: string[];
  industry?: string;
}

/**
 * Types for revenue range data
 */
export type RevenueRange = string | {
  [source: string]: RevenueSource;
};

export interface RevenueSource {
  annual_revenue_range_from?: number;
  annual_revenue_range_to?: number;
  annual_revenue_range_currency?: string;
  [key: string]: unknown;
}

/**
 * Helper function to map raw enrichment data to the processed format
 */
export function mapEnrichmentData(enrichedData: unknown): EnrichmentData {
  if (!enrichedData) return {};
  
  // Parse the JSON string if it's a string, otherwise use as is
  const data = typeof enrichedData === 'string' ? JSON.parse(enrichedData) : enrichedData;
  
  // Type guard to ensure data has the expected shape
  if (typeof data !== 'object' || data === null) {
    return {};
  }

  // Type assertion since we know the shape matches RawEnrichmentData
  const rawData = data as RawEnrichmentData;
  
  return {
    about: {
      name: rawData.company_name || rawData.company_legal_name,
      industries: rawData.categories_and_keywords || (rawData.industry ? [rawData.industry] : []),
      yearFounded: rawData.founded_year ? parseInt(rawData.founded_year) : undefined,
      totalEmployees: rawData.size_range,
      totalEmployeesExact: rawData.employees_count
    },
    socials: {
      twitter: rawData.twitter_url?.length ? { url: rawData.twitter_url[0] } : undefined,
      facebook: rawData.facebook_url?.length ? { url: rawData.facebook_url[0] } : undefined,
      linkedin: rawData.linkedin_url ? { url: rawData.linkedin_url } : undefined
    },
    finances: {
      revenue: formatRevenueRange(rawData.revenue_annual_range) || undefined
    },
    analytics: {
      monthlyVisitors: rawData.total_website_visits_monthly ? 
        `${rawData.total_website_visits_monthly}` : undefined
    },
    locations: {
      headquarters: rawData.hq_city || rawData.hq_state || rawData.hq_country ? {
        city: { name: rawData.hq_city || '' },
        state: { name: rawData.hq_state || '' },
        country: { name: rawData.hq_country || '' }
      } : undefined
    },
    descriptions: {
      primary: rawData.description_enriched || rawData.description
    },
    // Keep these for backward compatibility
    categories_and_keywords: rawData.categories_and_keywords,
    industry: rawData.industry
  };
}

/**
 * Format revenue range data into a string
 */
export function formatRevenueRange(revenueRange: RevenueRange | undefined | null): string | null {
  if (!revenueRange) return null;
  
  try {
    // If it's already a string, return it
    if (typeof revenueRange === 'string') return revenueRange;
    
    // Check if it's an object with source keys
    if (typeof revenueRange === 'object') {
      // Try to get the first source that has data
      const sources = Object.values(revenueRange);
      if (sources.length > 0) {
        const source = sources[0] as RevenueSource;
        
        // Check if it has range data
        if (source.annual_revenue_range_from || source.annual_revenue_range_to) {
          const currency = source.annual_revenue_range_currency || '$';
          const from = source.annual_revenue_range_from ? 
            `${currency}${(source.annual_revenue_range_from / 1000000).toFixed(0)}M` : '';
          const to = source.annual_revenue_range_to ? 
            `${currency}${(source.annual_revenue_range_to / 1000000).toFixed(0)}M` : '+';
          
          return from && to ? `${from} - ${to}` : (from || to);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error formatting revenue range:", error);
    return null;
  }
}
