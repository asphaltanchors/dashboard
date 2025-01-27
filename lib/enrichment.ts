import { prisma } from "./prisma"

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
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const enrichmentData = await response.json()

    // Update company record
    await prisma.company.update({
      where: { domain },
      data: {
        enriched: true,
        enrichedAt: new Date(),
        enrichedSource: 'thecompaniesapi.com',
        enrichmentData
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Enrichment failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
