import { prisma } from "./prisma"

interface GetCompaniesParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

export async function getCompanies({
  page = 1,
  pageSize = 10,
  searchTerm = '',
  sortColumn = 'domain',
  sortDirection = 'asc'
}: GetCompaniesParams = {}) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Calculate pagination
  const skip = (page - 1) * pageSize

  // Build where clause for search
  const where = searchTerm ? {
    OR: [
      { name: { contains: searchTerm, mode: 'insensitive' as const } },
      { domain: { contains: searchTerm, mode: 'insensitive' as const } }
    ]
  } : {}

  // Build order by object
  let orderBy: {
    name?: 'asc' | 'desc'
    domain?: 'asc' | 'desc'
    enrichedAt?: 'asc' | 'desc'
    enriched?: 'asc' | 'desc'
  } = {}
  if (sortColumn === 'name') {
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
        customers: {
          select: {
            id: true,
            orders: {
              select: {
                totalAmount: true
              }
            }
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
    companies: companies.map(company => {
    const totalOrders = company.customers.reduce((sum, customer) => {
      const customerTotal = customer.orders.reduce((orderSum, order) => 
        orderSum + Number(order.totalAmount), 0)
      return sum + customerTotal
    }, 0)

      return {
        id: company.id,
        domain: company.domain,
        name: company.name ?? company.domain,
        enriched: company.enriched,
        enrichedAt: company.enrichedAt,
        enrichedSource: company.enrichedSource ?? '',
        customerCount: company.customers.length,
        totalOrders: totalOrders
      }
    }),
    totalCount,
    recentCount
  }
}

export type Company = Awaited<ReturnType<typeof getCompanies>>['companies'][number]
