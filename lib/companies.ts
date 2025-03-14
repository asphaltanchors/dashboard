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
  'mail.com',
  'unknown-domain.com',
  'amazon-fba.com',
  'amazon.com'
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
  // Skip complex JSON search for very short search terms
  const shouldSearchJson = searchTerm.length >= 3;
  
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
        c."enrichmentData", 
        json_build_object(
          'customerCount', cs."customerCount",
          'totalOrders', cs."totalOrders"
        ) as "companyStats",
        GREATEST(
          COALESCE((c."enrichmentData"->'normalized_revenue'->'exact')::float, 0),
          COALESCE((c."enrichmentData"->'normalized_revenue'->'min')::float, 0)
        ) as revenue_value
      FROM "Company" c
      LEFT JOIN "CompanyStats" cs ON c.id = cs.id
      WHERE c.id IN (
        SELECT id FROM "Company" 
        WHERE ${where.AND[0] ? Prisma.sql`(
        name ILIKE ${`%${searchTerm}%`} 
        OR domain ILIKE ${`%${searchTerm}%`}
        ${shouldSearchJson ? Prisma.sql`
        OR "enrichmentData"->>'industry' ILIKE ${`%${searchTerm}%`}
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text("enrichmentData"->'about'->'industries') as industry
          WHERE industry ILIKE ${`%${searchTerm}%`}
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text("enrichmentData"->'categories_and_keywords') as category
          WHERE category ILIKE ${`%${searchTerm}%`}
        )` : Prisma.sql``}
      )` : Prisma.sql`TRUE`}
        ${filterConsumer ? Prisma.sql`AND domain NOT IN (${Prisma.join(CONSUMER_DOMAINS)})` : Prisma.sql``}
      )
      AND (
        c."enrichmentData"->'normalized_revenue'->'exact' IS NOT NULL 
        OR c."enrichmentData"->'normalized_revenue'->'min' IS NOT NULL
      )
      ORDER BY revenue_value ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}
      LIMIT ${pageSize}
      OFFSET ${skip}
    `;
  }

  // For non-revenue sorting, we need to modify the query to include industry search
  if (sortColumn !== 'revenue' && searchTerm) {
    // Use raw query to search in JSON fields
    query = prisma.$queryRaw`
      SELECT 
        c.id, c.domain, c.name, c.enriched, c."enrichedAt", c."enrichedSource", 
        c."enrichmentData", 
        json_build_object(
          'customerCount', cs."customerCount",
          'totalOrders', cs."totalOrders"
        ) as "companyStats"
      FROM "Company" c
      LEFT JOIN "CompanyStats" cs ON c.id = cs.id
      WHERE (
        c.name ILIKE ${`%${searchTerm}%`} 
        OR c.domain ILIKE ${`%${searchTerm}%`}
        ${shouldSearchJson ? Prisma.sql`
        OR c."enrichmentData"->>'industry' ILIKE ${`%${searchTerm}%`}
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(c."enrichmentData"->'about'->'industries') as industry
          WHERE industry ILIKE ${`%${searchTerm}%`}
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(c."enrichmentData"->'categories_and_keywords') as category
          WHERE category ILIKE ${`%${searchTerm}%`}
        )` : Prisma.sql``}
      )
      ${filterConsumer ? Prisma.sql`AND c.domain NOT IN (${Prisma.join(CONSUMER_DOMAINS)})` : Prisma.sql``}
      ORDER BY ${
        sortColumn === 'customerCount' ? Prisma.sql`cs."customerCount" ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}` :
        sortColumn === 'totalOrders' ? Prisma.sql`cs."totalOrders" ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}` :
        sortColumn === 'name' ? Prisma.sql`c.name ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}` :
        sortColumn === 'domain' ? Prisma.sql`c.domain ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}` :
        sortColumn === 'enrichedAt' ? Prisma.sql`c."enrichedAt" ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}` :
        sortColumn === 'enriched' ? Prisma.sql`c.enriched ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}` :
        Prisma.sql`c.domain ${sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}`
      }
      LIMIT ${pageSize}
      OFFSET ${skip}
    `;
  }

  // For count queries, we need to use raw SQL to include industry search
  const getCountQuery = (additionalConditions = '') => {
    if (!searchTerm) {
      // If no search term, use the standard Prisma count
      return prisma.company.count({
        where: filterConsumer ? {
          domain: {
            not: {
              in: CONSUMER_DOMAINS
            }
          }
        } : {}
      });
    }
    
    // Otherwise, use raw SQL to count with industry search
    return prisma.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM "Company" c
      WHERE (
        c.name ILIKE ${`%${searchTerm}%`} 
        OR c.domain ILIKE ${`%${searchTerm}%`}
        ${shouldSearchJson ? Prisma.sql`
        OR c."enrichmentData"->>'industry' ILIKE ${`%${searchTerm}%`}
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(c."enrichmentData"->'about'->'industries') as industry
          WHERE industry ILIKE ${`%${searchTerm}%`}
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(c."enrichmentData"->'categories_and_keywords') as category
          WHERE category ILIKE ${`%${searchTerm}%`}
        )` : Prisma.sql``}
      )
      ${filterConsumer ? Prisma.sql`AND c.domain NOT IN (${Prisma.join(CONSUMER_DOMAINS)})` : Prisma.sql``}
      ${Prisma.raw(additionalConditions)}
    `;
  };

  const [companies, totalCountResult, recentCountResult] = await Promise.all([
    query,
    getCountQuery(),
    getCountQuery(`AND c."enrichedAt" >= '${thirtyDaysAgo.toISOString()}'`)
  ]);

  // Ensure we have proper number types for counts
  const totalCount = typeof totalCountResult === 'number' ? totalCountResult : 
                    Array.isArray(totalCountResult) && totalCountResult.length > 0 ? 
                    Number(totalCountResult[0].count) : 0;
  
  const recentCount = typeof recentCountResult === 'number' ? recentCountResult : 
                     Array.isArray(recentCountResult) && recentCountResult.length > 0 ? 
                     Number(recentCountResult[0].count) : 0;

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
