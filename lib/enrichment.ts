import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"

interface EnrichmentResponse {
  success: boolean
  error?: string
}

export async function enrichCompany(domain: string): Promise<EnrichmentResponse> {
  const apiToken = process.env.COMPANIES_API_TOKEN
  if (!apiToken) {
    return {
      success: false,
      error: "API token not configured"
    }
  }

  try {
    // Make API request
    const response = await fetch(
      `https://api.thecompaniesapi.com/v2/companies/${domain}`,
      {
        headers: {
          'Authorization': `Basic ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      // Handle failed enrichment by updating record with error info
      await prisma.company.update({
        where: { domain },
        data: {
          enriched: false,
          enrichedAt: new Date(),
          enrichedSource: 'thecompaniesapi.com',
          enrichmentData: Prisma.JsonNull,
          enrichmentError: `API request failed: ${response.statusText}`
        }
      })
      return {
        success: false,
        error: `API request failed: ${response.statusText}`
      }
    }

    const enrichmentData = await response.json()

    // Update company record with successful enrichment
    await prisma.company.update({
      where: { domain },
      data: {
        enriched: true,
        enrichedAt: new Date(),
        enrichedSource: 'thecompaniesapi.com',
        enrichmentData,
        enrichmentError: null
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
        enrichedSource: 'thecompaniesapi.com',
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
