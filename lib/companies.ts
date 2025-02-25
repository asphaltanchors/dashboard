import { prisma } from "./prisma"
import { Prisma } from "@prisma/client"

export const CONSUMER_DOMAINS = [
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
  } else if (sortColumn === 'revenue') {
    // For revenue sorting, we'll use the enrichmentData.normalized_revenue field
    // Since this is a JSON field, we need to use a raw query to sort by it
    // We'll handle this in the query below
    orderBy = {} // Will be handled in the query
  }

  // Special handling for revenue sorting
  let query = prisma.company.findMany({
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
      enrichmentData: true,
      companyStats: {
        select: {
          customerCount: true,
          totalOrders: true
        }
      }
    }
  });

  // If sorting by revenue, we need to handle it differently
  if (sortColumn === 'revenue') {
    // Use raw query to sort by JSON field
    query = prisma.$queryRaw`
      SELECT 
        c.id, c.domain, c.name, c.enriched, c."enrichedAt", c."enrichedSource", 
        c."enrichmentData", cs."customerCount", cs."totalOrders"
      FROM "Company" c
      LEFT JOIN "CompanyStats" cs ON c.id = cs.id
      WHERE c.id IN (
        SELECT id FROM "Company" 
        WHERE ${where.AND[0] ? Prisma.sql`(name ILIKE ${`%${searchTerm}%`} OR domain ILIKE ${`%${searchTerm}%`})` : Prisma.sql`TRUE`}
        ${filterConsumer ? Prisma.sql`AND domain NOT IN (${Prisma.join(CONSUMER_DOMAINS)})` : Prisma.sql``}
      )
      AND (
        c."enrichmentData"->'normalized_revenue'->'exact' IS NOT NULL 
        OR c."enrichmentData"->'normalized_revenue'->'min' IS NOT NULL
      )
      ORDER BY GREATEST(
        COALESCE((c."enrichmentData"->'normalized_revenue'->'exact')::float, 0),
        COALESCE((c."enrichmentData"->'normalized_revenue'->'min')::float, 0)
      ) ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `;
  }

  const [companies, totalCount, recentCount] = await Promise.all([
    query,
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
      enrichmentData: company.enrichmentData,
      customerCount: company.companyStats?.customerCount ?? 0,
      totalOrders: company.companyStats?.totalOrders ? Number(company.companyStats.totalOrders) : 0
    })),
    totalCount,
    recentCount
  }
}


// Use a simpler Company type that accepts any JSON value for enrichmentData
export type Company = Awaited<ReturnType<typeof getCompanies>>['companies'][number]
