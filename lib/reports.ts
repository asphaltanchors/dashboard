import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { CONSUMER_DOMAINS } from "@/lib/companies"
import { SalesChannelMetric } from "@/types/reports"

interface FilterParams {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
}

interface ProductLineMetric {
  product_line: string
  order_count: string
  total_units: string
  total_revenue: string
}

interface ProductDetail {
  productCode: string
  name: string
  description: string | null
}

// Canadian address detection patterns
const CANADIAN_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU']

const ADHESIVE_PRODUCT_CODES = [
  // EPX2 products
  '82-5002.K',
  '82-5002.010',
  // EPX3 products
  '82-6002'
]

export async function getCanadianSalesMetrics(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setDate(today.getDate() - days)
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setDate(currentPeriodStart.getDate() - days)

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
  interface OrderItem {
    productCode: string;
    amount: Prisma.Decimal;
  }

  interface Order {
    items: OrderItem[];
    totalAmount?: Prisma.Decimal;
  }

  const calculateNetRevenue = (orders: Order[]) => 
    orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum: number, item: OrderItem) => 
        !item.productCode.startsWith('SYS-') ? itemSum + Number(item.amount) : itemSum
      , 0)
    , 0)

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
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)
  
  const customers = await prisma.customer.findMany({
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

  const today = new Date()
  const days = dateRange ? parseInt(dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  // Calculate pagination
  const skip = (page - 1) * pageSize

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
      ]
    },
    select: {
      id: true
    }
  })

  // Build where clause for search and filters
  const where: any = {
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
  let orderBy: any = {}
  if (sortColumn === 'customerName') {
    orderBy = {
      customer: {
        customerName: sortDirection
      }
    }
  } else {
    orderBy = { [sortColumn]: sortDirection }
  }

  const [orders, totalCount, recentCount] = await Promise.all([
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
    quickbooksId: order.quickbooksId
  }))

  return {
    orders: transformedOrders,
    totalCount,
    recentCount
  }
}

export async function getCanadianUnitsSold(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)
  
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
