import { prisma } from "./prisma"

export async function getCustomers() {
  const [customers, totalCount, recentCount] = await Promise.all([
    prisma.customer.findMany({
      select: {
        id: true,
        customerName: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        emails: {
          where: {
            isPrimary: true,
          },
          select: {
            email: true,
          },
          take: 1,
        },
        phones: {
          where: {
            isPrimary: true,
          },
          select: {
            phone: true,
          },
          take: 1,
        },
        status: true,
        createdAt: true,
        orders: {
          select: {
            totalAmount: true
          }
        }
      },
      orderBy: {
        customerName: 'asc',
      },
    }),
    prisma.customer.count(),
    prisma.customer.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
  ])

  const mappedCustomers = customers.map((customer) => {
    const totalOrders = customer.orders.reduce((sum, order) => 
      sum + Number(order.totalAmount), 0)

    return {
      id: customer.id,
      name: customer.customerName,
      company: customer.company?.name ?? '',
      companyId: customer.company?.id,
      email: customer.emails[0]?.email ?? '',
      phone: customer.phones[0]?.phone ?? '',
      status: customer.status,
      createdAt: customer.createdAt,
      totalOrders: totalOrders
    }
  })

  return {
    customers: mappedCustomers,
    totalCount,
    recentCount
  }
}

export type Customer = Awaited<ReturnType<typeof getCustomers>>['customers'][number]
