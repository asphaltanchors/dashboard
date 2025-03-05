import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { CANADIAN_PROVINCES, FilterParams, calculateNetRevenue, calculatePeriods, calculateDateRange } from "./common"
import { CONSUMER_DOMAINS } from "@/lib/companies"

export async function getCanadianSalesMetrics(filters?: FilterParams) {
  const { currentPeriodStart, previousPeriodStart } = calculatePeriods(filters?.dateRange)

  // First get all Canadian customers
  const canadianCustomers = await prisma.customer.findMany({
    where: {
      OR: [
        {
          billingAddress: {
            OR: [
              { country: { contains: 'canada', mode: 'insensitive' } },
              { state: { in: CANADIAN_PROVINCES } },
              { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
            ]
          }
        },
        {
          shippingAddress: {
            OR: [
              { country: { contains: 'canada', mode: 'insensitive' } },
              { state: { in: CANADIAN_PROVINCES } },
              { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
            ]
          }
        }
      ],
      ...(filters?.filterConsumer ? {
        company: {
          domain: {
            not: {
              in: CONSUMER_DOMAINS
            }
          }
        }
      } : {})
    },
    select: {
      id: true
    }
  })

  // Then get their orders with amount filters
  const orders = await prisma.order.findMany({
    where: {
      customerId: {
        in: canadianCustomers.map(c => c.id)
      },
      orderDate: {
        gte: previousPeriodStart
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
        select: {
          productCode: true,
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
  const currentMetrics = {
    orderCount: currentPeriodOrders.length,
    totalRevenue: currentPeriodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    netRevenue: calculateNetRevenue(currentPeriodOrders)
  }

  const previousMetrics = {
    orderCount: previousPeriodOrders.length,
    totalRevenue: previousPeriodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    netRevenue: calculateNetRevenue(previousPeriodOrders)
  }

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
      totalRevenue: previousMetrics.totalRevenue ? 
        ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue * 100).toFixed(1) : 
        "0.0",
      netRevenue: previousMetrics.netRevenue ? 
        ((currentMetrics.netRevenue - previousMetrics.netRevenue) / previousMetrics.netRevenue * 100).toFixed(1) : 
        "0.0"
    }
  }
}

export async function getCanadianTopCustomers(filters?: FilterParams) {
  const { startDate } = calculateDateRange(filters?.dateRange)
  
  const customers = await prisma.customer.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              billingAddress: {
                OR: [
                  { country: { contains: 'canada', mode: 'insensitive' } },
                  { state: { in: CANADIAN_PROVINCES } },
                  { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                ]
              }
            },
            {
              shippingAddress: {
                OR: [
                  { country: { contains: 'canada', mode: 'insensitive' } },
                  { state: { in: CANADIAN_PROVINCES } },
                  { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                ]
              }
            }
          ]
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
      ],
      orders: {
        some: {
          orderDate: {
            gte: startDate
          },
          ...(filters?.minAmount || filters?.maxAmount ? {
            totalAmount: {
              ...(filters.minAmount ? { gte: filters.minAmount } : {}),
              ...(filters.maxAmount ? { lte: filters.maxAmount } : {})
            }
          } : {})
        }
      }
    },
    include: {
      company: {
        select: {
          name: true,
          domain: true
        }
      },
      orders: {
        where: {
          orderDate: {
            gte: startDate
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
            select: {
              quantity: true,
              amount: true
            }
          }
        }
      }
    }
  })

  return customers.map(customer => ({
    id: customer.id,
    customerName: customer.customerName,
    companyName: customer.company?.name ?? null,
    companyDomain: customer.company?.domain ?? null,
    orderCount: customer.orders.length,
    totalRevenue: customer.orders.reduce((sum: number, order) => sum + Number(order.totalAmount), 0),
    totalUnits: customer.orders.reduce((sum: number, order) => 
      sum + order.items.reduce((itemSum: number, item) => itemSum + Number(item.quantity), 0), 0
    )
  })).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

interface GetCanadianOrdersParams extends FilterParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

export async function getCanadianOrders(params: GetCanadianOrdersParams = {}) {
  const {
    dateRange,
    minAmount,
    maxAmount,
    page = 1,
    pageSize = 10,
    searchTerm = '',
    sortColumn = 'orderDate',
    sortDirection = 'desc'
  } = params

  const { startDate } = calculateDateRange(dateRange)

  // Calculate pagination
  const skip = (page - 1) * pageSize

  // First get all Canadian customers
  const canadianCustomers = await prisma.customer.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              billingAddress: {
                OR: [
                  { country: { contains: 'canada', mode: 'insensitive' } },
                  { state: { in: CANADIAN_PROVINCES } },
                  { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                ]
              }
            },
            {
              shippingAddress: {
                OR: [
                  { country: { contains: 'canada', mode: 'insensitive' } },
                  { state: { in: CANADIAN_PROVINCES } },
                  { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                ]
              }
            }
          ]
        },
        ...(params.filterConsumer ? [{
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
    select: {
      id: true
    }
  })

  // Build where clause for search and filters
  const where: Prisma.OrderWhereInput = {
    customerId: {
      in: canadianCustomers.map(c => c.id)
    },
    orderDate: {
      gte: startDate
    }
  }

  if (minAmount || maxAmount) {
    where.totalAmount = {
      ...(minAmount ? { gte: minAmount } : {}),
      ...(maxAmount ? { lte: maxAmount } : {})
    }
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

  const [orders, totalCount, recentCount, accountsReceivable] = await Promise.all([
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
    prisma.order.count({
      where: {
        ...where,
        orderDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }),
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
    recentCount,
    accountsReceivable: Number(accountsReceivable._sum.totalAmount || 0)
  }
}

export async function getCanadianUnitsSold(filters?: FilterParams) {
  const { startDate } = calculateDateRange(filters?.dateRange)
  
  // First get all Canadian customers
  const canadianCustomers = await prisma.customer.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              billingAddress: {
                OR: [
                  { country: { contains: 'canada', mode: 'insensitive' } },
                  { state: { in: CANADIAN_PROVINCES } },
                  { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                ]
              }
            },
            {
              shippingAddress: {
                OR: [
                  { country: { contains: 'canada', mode: 'insensitive' } },
                  { state: { in: CANADIAN_PROVINCES } },
                  { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                ]
              }
            }
          ]
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
    select: {
      id: true
    }
  })

  // Then get their orders with filters
  const orders = await prisma.order.findMany({
    where: {
      customerId: {
        in: canadianCustomers.map(c => c.id)
      },
      orderDate: {
        gte: startDate
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
        include: {
          product: {
            select: {
              name: true,
              description: true
            }
          }
        }
      }
    }
  })

  // Aggregate units by product
  const productTotals = new Map<string, {
    productCode: string,
    productName: string,
    description: string,
    totalUnits: number,
    totalRevenue: number
  }>()

  orders.forEach(order => {
    order.items.forEach(item => {
      const existing = productTotals.get(item.productCode) || {
        productCode: item.productCode,
        productName: item.product?.name ?? item.productCode,
        description: item.product?.description ?? '',
        totalUnits: 0,
        totalRevenue: 0
      }
      existing.totalUnits += Number(item.quantity)
      existing.totalRevenue += Number(item.amount)
      productTotals.set(item.productCode, existing)
    })
  })

  return Array.from(productTotals.values())
    .sort((a, b) => b.totalUnits - a.totalUnits)
}

export async function getUSSalesMetrics(filters?: FilterParams) {
  const { currentPeriodStart, previousPeriodStart } = calculatePeriods(filters?.dateRange)

  // First get all non-Canadian customers
  const usCustomers = await prisma.customer.findMany({
    where: {
      AND: [
        {
          NOT: {
            OR: [
              {
                billingAddress: {
                  OR: [
                    { country: { contains: 'canada', mode: 'insensitive' } },
                    { state: { in: CANADIAN_PROVINCES } },
                    { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                  ]
                }
              },
              {
                shippingAddress: {
                  OR: [
                    { country: { contains: 'canada', mode: 'insensitive' } },
                    { state: { in: CANADIAN_PROVINCES } },
                    { postalCode: { contains: '[A-Z][0-9][A-Z]', mode: 'insensitive' } }
                  ]
                }
              }
            ]
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
    select: {
      id: true
    }
  })

  // Then get their orders with amount filters
  const orders = await prisma.order.findMany({
    where: {
      customerId: {
        in: usCustomers.map(c => c.id)
      },
      orderDate: {
        gte: previousPeriodStart
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
        select: {
          productCode: true,
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
  const currentMetrics = {
    orderCount: currentPeriodOrders.length,
    totalRevenue: currentPeriodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    netRevenue: calculateNetRevenue(currentPeriodOrders)
  }

  const previousMetrics = {
    orderCount: previousPeriodOrders.length,
    totalRevenue: previousPeriodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
    netRevenue: calculateNetRevenue(previousPeriodOrders)
  }

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
      totalRevenue: previousMetrics.totalRevenue ? 
        ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue * 100).toFixed(1) : 
        "0.0",
      netRevenue: previousMetrics.netRevenue ? 
        ((currentMetrics.netRevenue - previousMetrics.netRevenue) / previousMetrics.netRevenue * 100).toFixed(1) : 
        "0.0"
    }
  }
}
