import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { ADHESIVE_PRODUCT_CODES, FilterParams, calculateDateRange, calculatePeriods } from "./common"
import { CONSUMER_DOMAINS } from "@/lib/companies"

export async function getAdhesiveMetrics(filters?: FilterParams) {
  const { currentPeriodStart, previousPeriodStart } = calculatePeriods(filters?.dateRange)

  // First, get customers who have never ordered SP products
  const customersWithSPOrders = await prisma.customer.findMany({
    where: {
      orders: {
        some: {
          items: {
            some: {
              productCode: {
                startsWith: '01-'
              }
            }
          }
        }
      }
    },
    select: {
      id: true
    }
  })

  const customersWithSPOrderIds = customersWithSPOrders.map(c => c.id)

  // Get all orders with adhesive products from customers who have never ordered SP products
  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: previousPeriodStart
      },
      items: {
        some: {
          productCode: {
            in: ADHESIVE_PRODUCT_CODES
          }
        }
      },
      customer: {
        AND: [
          {
            id: {
              notIn: customersWithSPOrderIds
            }
          },
          ...(filters?.filterConsumer ? [{
            company: {
              domain: {
                not: {
                  in: CONSUMER_DOMAINS
                }
              }
            }
          }] : [])
        ]
      },
      ...(filters?.minAmount || filters?.maxAmount ? {
        totalAmount: {
          ...(filters.minAmount ? { gte: filters.minAmount } : {}),
          ...(filters.maxAmount ? { lte: filters.maxAmount } : {})
        }
      } : {})
    },
    include: {
      items: {
        where: {
          productCode: {
            in: ADHESIVE_PRODUCT_CODES
          }
        },
        select: {
          quantity: true,
          amount: true
        }
      }
    }
  })

  // Split orders by period
  const currentPeriodOrders = orders.filter(o => o.orderDate >= currentPeriodStart)
  const previousPeriodOrders = orders.filter(o => o.orderDate >= previousPeriodStart && o.orderDate < currentPeriodStart)

  // Calculate metrics
  const calculateMetrics = (periodOrders: typeof orders) => ({
    orderCount: periodOrders.length,
    totalUnits: periodOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity), 0), 0),
    totalRevenue: periodOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + Number(item.amount), 0), 0)
  })

  const currentMetrics = calculateMetrics(currentPeriodOrders)
  const previousMetrics = calculateMetrics(previousPeriodOrders)

  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365

  return {
    currentPeriod: {
      label: `Last ${days} Days`,
      ...currentMetrics
    },
    previousPeriod: {
      label: `Previous ${days} Days`,
      ...previousMetrics
    },
    changes: {
      orderCount: previousMetrics.orderCount ? 
        ((currentMetrics.orderCount - previousMetrics.orderCount) / previousMetrics.orderCount * 100).toFixed(1) : 
        "0.0",
      totalUnits: previousMetrics.totalUnits ? 
        ((currentMetrics.totalUnits - previousMetrics.totalUnits) / previousMetrics.totalUnits * 100).toFixed(1) : 
        "0.0",
      totalRevenue: previousMetrics.totalRevenue ? 
        ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue * 100).toFixed(1) : 
        "0.0"
    }
  }
}

interface GetAdhesiveOrdersParams extends FilterParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

export async function getAdhesiveOnlyOrders(params: GetAdhesiveOrdersParams = {}) {
  const {
    dateRange,
    minAmount,
    maxAmount,
    filterConsumer,
    page = 1,
    pageSize = 10,
    searchTerm = '',
    sortColumn = 'orderDate',
    sortDirection = 'desc'
  } = params

  const { startDate } = calculateDateRange(dateRange)

  // Calculate pagination
  const skip = (page - 1) * pageSize

  // First, get customers who have never ordered SP products
  const customersWithSPOrders = await prisma.customer.findMany({
    where: {
      orders: {
        some: {
          items: {
            some: {
              productCode: {
                startsWith: '01-'
              }
            }
          }
        }
      }
    },
    select: {
      id: true
    }
  })

  const customersWithSPOrderIds = customersWithSPOrders.map(c => c.id)

  // Build where clause for search and filters
  const where: Prisma.OrderWhereInput = {
    orderDate: {
      gte: startDate
    },
    items: {
      some: {
        productCode: {
          in: ADHESIVE_PRODUCT_CODES
        }
      }
    },
    customer: {
      AND: [
        {
          id: {
            notIn: customersWithSPOrderIds
          }
        },
        ...(filterConsumer ? [{
          company: {
            domain: {
              not: {
                in: CONSUMER_DOMAINS
              }
            }
          }
        }] : [])
      ]
    },
    ...(minAmount || maxAmount ? {
      totalAmount: {
        ...(minAmount ? { gte: minAmount } : {}),
        ...(maxAmount ? { lte: maxAmount } : {})
      }
    } : {})
  }

  if (searchTerm) {
    where.OR = [
      { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
      { 
        customer: {
          is: {
            customerName: { contains: searchTerm, mode: 'insensitive' }
          }
        } 
      }
    ]
  }

  // Build order by object dynamically
  let orderBy: Prisma.OrderOrderByWithRelationInput = {}
  if (sortColumn === 'customerName') {
    orderBy = {
      customer: {
        customerName: sortDirection
      }
    }
  } else {
    orderBy = { [sortColumn]: sortDirection }
  }

  const [orders, totalCount, accountsReceivable] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        customer: {
          select: {
            customerName: true
          }
        },
        shippingAddress: {
          select: {
            line1: true,
            line2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true
          }
        }
      }
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        AND: [
          where,
          {
            paymentStatus: {
              in: ['UNPAID', 'PARTIAL']
            }
          }
        ]
      }
    })
  ])

  // Transform orders to match the TableData interface
  const transformedOrders = orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    customerName: order.customer.customerName,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount),
    dueDate: order.dueDate,
    paymentMethod: order.paymentMethod,
    quickbooksId: order.quickbooksId,
    shippingAddress: order.shippingAddress
  }))

  return {
    orders: transformedOrders,
    totalCount,
    recentCount: totalCount, // For now, using total count as recent count
    accountsReceivable: Number(accountsReceivable._sum.totalAmount || 0)
  }
}
