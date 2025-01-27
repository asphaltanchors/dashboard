import { prisma } from "./prisma"

const CONSUMER_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'marketplace.amazon.com',
  'comcast.net',
  'verizon.net',
  'msn.com',
  'me.com',
  'att.net',
  'live.com',
  'bellsouth.net',
  'sbcglobal.net',
  'cox.net',
  'bellsouth.net',
  'mac.com',
  'mail.com'
]

interface GetCompaniesParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  filterConsumer?: boolean
}

export async function getCompanies({
  page = 1,
  pageSize = 10,
  searchTerm = '',
  sortColumn = 'domain',
  sortDirection = 'asc',
  filterConsumer = true
}: GetCompaniesParams = {}) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Calculate pagination
  const skip = (page - 1) * pageSize

  // Build where clause for search and filtering
  const where = {
    AND: [
      searchTerm ? {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' as const } },
          { domain: { contains: searchTerm, mode: 'insensitive' as const } }
        ]
      } : {},
      filterConsumer ? {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      } : {}
    ]
  }

  // Build order by based on sort column
  let orderBy: Record<string, { [key: string]: 'asc' | 'desc' } | 'asc' | 'desc'> = {}
  if (sortColumn === 'customerCount') {
    orderBy = { companyStats: { customerCount: sortDirection } }
  } else if (sortColumn === 'totalOrders') {
    orderBy = { companyStats: { totalOrders: sortDirection } }
  } else if (sortColumn === 'name') {
    orderBy = { name: sortDirection }
  } else if (sortColumn === 'domain') {
    orderBy = { domain: sortDirection }
  } else if (sortColumn === 'enrichedAt') {
    orderBy = { enrichedAt: sortDirection }
  } else if (sortColumn === 'enriched') {
    orderBy = { enriched: sortDirection }
  }

  const [companies, totalCount, recentCount] = await Promise.all([
    prisma.company.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
      select: {
        id: true,
        domain: true,
        name: true,
        enriched: true,
        enrichedAt: true,
        enrichedSource: true,
        companyStats: {
          select: {
            customerCount: true,
            totalOrders: true
          }
        }
      }
    }),
    prisma.company.count({
      where
    }),
    prisma.company.count({
      where: {
        AND: [
          where,
          {
            enrichedAt: {
              gte: thirtyDaysAgo
            }
          }
        ]
      }
    })
  ]);

  return {
    companies: companies.map(company => ({
      id: company.id,
      domain: company.domain,
      name: company.name ?? company.domain,
      enriched: company.enriched,
      enrichedAt: company.enrichedAt,
      enrichedSource: company.enrichedSource ?? '',
      customerCount: company.companyStats?.customerCount ?? 0,
      totalOrders: company.companyStats?.totalOrders ? Number(company.companyStats.totalOrders) : 0
    })),
    totalCount,
    recentCount
  }
}

export type Company = Awaited<ReturnType<typeof getCompanies>>['companies'][number]
