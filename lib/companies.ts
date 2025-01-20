import { prisma } from "./prisma"

export async function getCompanies() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
          id: true,
          orders: {
            select: {
              totalAmount: true
            }
          }
        }
      }
    },
    orderBy: {
      domain: 'asc',
    },
  })

  const totalCount = companies.length;
  const recentCount = companies.filter(company => company.enrichedAt && company.enrichedAt > thirtyDaysAgo).length;

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
