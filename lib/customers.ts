import { prisma } from "./prisma"

interface GetCustomersParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

export async function getCustomers({
  page = 1,
  pageSize = 10,
  searchTerm = '',
  sortColumn = 'customerName',
  sortDirection = 'asc'
}: GetCustomersParams = {}) {
  // Calculate pagination
  const skip = (page - 1) * pageSize

  // Build where clause for search
  const where = searchTerm ? {
    OR: [
      { customerName: { contains: searchTerm, mode: 'insensitive' as const } },
      { company: { name: { contains: searchTerm, mode: 'insensitive' as const } } },
      { emails: { some: { email: { contains: searchTerm, mode: 'insensitive' as const } } } }
    ]
  } : {}

  // Build order by object
  let orderBy: {
    customerName?: 'asc' | 'desc'
    company?: {
      name: 'asc' | 'desc'
    }
    createdAt?: 'asc' | 'desc'
    status?: 'asc' | 'desc'
  } = {}
  if (sortColumn === 'name') {
    orderBy = { customerName: sortDirection }
  } else if (sortColumn === 'company') {
    orderBy = { company: { name: sortDirection } }
  } else if (sortColumn === 'createdAt') {
    orderBy = { createdAt: sortDirection }
  } else if (sortColumn === 'status') {
    orderBy = { status: sortDirection }
  }

  const [customers, totalCount, recentCount] = await Promise.all([
    prisma.customer.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
      select: {
        id: true,
        customerName: true,
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
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
    }),
    prisma.customer.count({
      where
    }),
    prisma.customer.count({
      where: {
        AND: [
          where,
          {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        ]
      }
    })
  ])

  const mappedCustomers = customers.map((customer) => {
    const totalOrders = customer.orders.reduce((sum, order) => 
      sum + Number(order.totalAmount), 0)

    return {
      id: customer.id,
      name: customer.customerName,
      company: customer.company?.name ?? customer.company?.domain ?? '',
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
