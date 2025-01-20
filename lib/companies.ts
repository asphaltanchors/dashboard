import { prisma } from "./prisma"

export async function getCompanies() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      domain: true,
      name: true,
      enriched: true,
      enrichedAt: true,
      enrichedSource: true,
      customers: {
        select: {
          id: true
        }
      }
    },
    orderBy: {
      domain: 'asc',
    },
  })

  return companies.map(company => ({
    id: company.id,
    domain: company.domain,
    name: company.name ?? company.domain,
    enriched: company.enriched,
    enrichedAt: company.enrichedAt,
    enrichedSource: company.enrichedSource ?? '',
    customerCount: company.customers.length
  }))
}

export type Company = Awaited<ReturnType<typeof getCompanies>>[number]
