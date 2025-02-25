import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { CONSUMER_DOMAINS } from "@/lib/companies"
import { ProductSalesMetric, SalesChannelMetric } from "@/types/reports"

interface FilterParams {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
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

export async function getActualUnitsSold(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  // Build additional WHERE clauses for filters
  const filterClauses = []
  if (filters?.minAmount) {
    filterClauses.push(`o."totalAmount" >= ${filters.minAmount}`)
  }
  if (filters?.maxAmount) {
    filterClauses.push(`o."totalAmount" <= ${filters.maxAmount}`)
  }
  if (filters?.filterConsumer) {
    filterClauses.push(`
      NOT EXISTS (
        SELECT 1 FROM "Customer" c
        JOIN "Company" comp ON c."companyDomain" = comp."domain"
        WHERE c."id" = o."customerId"
        AND comp."domain" = ANY(ARRAY[${CONSUMER_DOMAINS.map(d => `'${d}'`).join(',')}])
      )
    `)
  }

  const additionalFilters = filterClauses.length > 0 
    ? 'AND ' + filterClauses.join(' AND ')
    : ''

  const results = await prisma.$queryRawUnsafe<Array<ProductSalesMetric>>(`
    WITH product_categories AS (
      SELECT 
        oi."productCode",
        CASE
          -- SP10
          WHEN "productCode" LIKE '01-6310%' OR "productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'SP10'
          -- SP12
          WHEN "productCode" LIKE '01-6315%' OR "productCode" IN ('01-6315.3SK', '01-6315.3SK-2') THEN 'SP12'
          -- SP18
          WHEN "productCode" LIKE '01-6318%' OR "productCode" = '01-6318.7SK' THEN 'SP18'
          -- SP58
          WHEN "productCode" LIKE '01-6358%' OR "productCode" IN ('01-6358.5SK', '01-6358.5SK-2') THEN 'SP58'
          -- am625
          WHEN "productCode" IN ('01-7014', '01-7014-FBA') THEN 'am625'
          ELSE 'Other'
        END as product_line,
        CASE 
          WHEN "productCode" IN ('01-6318.7SK', '01-6315.3SK', '01-6315.3SK-2', '01-6358.5SK', '01-6358.5SK-2') THEN 'Stainless Steel'
          WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' THEN 'Zinc Plated'
          WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
          WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Epoxy'
          WHEN "productCode" IN ('01-7014', '01-7014-FBA') THEN 'Plastic'
          WHEN "productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'Zinc Plated'
          ELSE 'Other'
        END as material_type,
        CASE 
          WHEN "productCode" = '01-7011.PST' THEN 4
          WHEN "productCode" = '01-7014' THEN 4
          WHEN "productCode" = '01-7014-FBA' THEN 4
          WHEN "productCode" = '01-7010-FBA' THEN 4
          WHEN "productCode" = '01-7010' THEN 4
          WHEN "productCode" = '01-7013' THEN 4
          WHEN "productCode" = '01-6310.72L' THEN 72
          ELSE 6
        END as quantity_multiplier,
        oi.quantity,
        oi.amount,
        oi."orderId"
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      WHERE (oi."productCode" LIKE '01-63%'
             OR oi."productCode" LIKE '01-70%')
      AND o."orderDate" >= '${startDate.toISOString()}'
      ${additionalFilters}
    )
    SELECT 
      product_line,
      material_type,
      COUNT(DISTINCT "orderId") as order_count,
      CAST(SUM(CAST(quantity AS numeric) * quantity_multiplier) AS text) as total_units
    FROM product_categories
    GROUP BY 
      product_line,
      material_type
    ORDER BY 
      product_line,
      material_type
  `)

  return results
}

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

  const today = new Date()
  const days = dateRange ? parseInt(dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

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

export async function getAdhesiveMetrics(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setDate(today.getDate() - days)
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setDate(currentPeriodStart.getDate() - days)

  // Get all orders with adhesive products
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
      ...(filters?.minAmount || filters?.maxAmount ? {
        totalAmount: {
          ...(filters.minAmount ? { gte: filters.minAmount } : {}),
          ...(filters.maxAmount ? { lte: filters.maxAmount } : {})
        }
      } : {}),
      ...(filters?.filterConsumer ? {
        customer: {
          company: {
            domain: {
              not: {
                in: CONSUMER_DOMAINS
              }
            }
          }
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

  const today = new Date()
  const days = dateRange ? parseInt(dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  // Calculate pagination
  const skip = (page - 1) * pageSize

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
    ...(minAmount || maxAmount ? {
      totalAmount: {
        ...(minAmount ? { gte: minAmount } : {}),
        ...(maxAmount ? { lte: maxAmount } : {})
      }
    } : {}),
    ...(filterConsumer ? {
      customer: {
        company: {
          domain: {
            not: {
              in: CONSUMER_DOMAINS
            }
          }
        }
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

export async function getCompanyOrderMetrics(months: number) {
  const today = new Date()
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setMonth(today.getMonth() - months)
  
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - months)

  // Get all orders grouped by company for both periods
  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: previousPeriodStart
      },
      customer: {
        company: {
          isNot: null
        }
      }
    },
    include: {
      customer: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          }
        }
      }
    }
  })

  // Group orders by company and period
  const companyOrders = new Map<string, {
    id: string
    name: string | null
    domain: string
    currentTotal: number
    previousTotal: number
  }>()

  orders.forEach(order => {
    const company = order.customer.company
    if (!company) return

    const existing = companyOrders.get(company.id) || {
      id: company.id,
      name: company.name,
      domain: company.domain,
      currentTotal: 0,
      previousTotal: 0
    }

    const amount = Number(order.totalAmount)
    if (order.orderDate >= currentPeriodStart) {
      existing.currentTotal += amount
    } else if (order.orderDate >= previousPeriodStart && order.orderDate < currentPeriodStart) {
      existing.previousTotal += amount
    }

    companyOrders.set(company.id, existing)
  })

  // Calculate percentage changes and filter out companies with no orders
  const companies = Array.from(companyOrders.values())
    .filter(company => company.currentTotal > 0 || company.previousTotal > 0)
    .map(company => ({
      ...company,
      percentageChange: company.previousTotal > 0 
        ? ((company.currentTotal - company.previousTotal) / company.previousTotal * 100)
        : company.currentTotal > 0 ? 100 : 0
    }))
    .sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange))

  // Calculate summary statistics
  const increasing = companies.filter(c => c.percentageChange > 0)
  const decreasing = companies.filter(c => c.percentageChange < 0)

  return {
    companies,
    summary: {
      increasingCount: increasing.length,
      decreasingCount: decreasing.length,
      averageIncrease: increasing.length > 0 
        ? increasing.reduce((sum, c) => sum + c.percentageChange, 0) / increasing.length
        : 0,
      averageDecrease: decreasing.length > 0
        ? Math.abs(decreasing.reduce((sum, c) => sum + c.percentageChange, 0) / decreasing.length)
        : 0
    }
  }
}

// Material type analysis data
export async function getMaterialTypeMetrics(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  // Build additional WHERE clauses for filters
  const filterClauses = []
  if (filters?.minAmount) {
    filterClauses.push(`o."totalAmount" >= ${filters.minAmount}`)
  }
  if (filters?.maxAmount) {
    filterClauses.push(`o."totalAmount" <= ${filters.maxAmount}`)
  }
  if (filters?.filterConsumer) {
    filterClauses.push(`
      NOT EXISTS (
        SELECT 1 FROM "Customer" c
        JOIN "Company" comp ON c."companyDomain" = comp."domain"
        WHERE c."id" = o."customerId"
        AND comp."domain" = ANY(ARRAY[${CONSUMER_DOMAINS.map(d => `'${d}'`).join(',')}])
      )
    `)
  }

  const additionalFilters = filterClauses.length > 0 
    ? 'AND ' + filterClauses.join(' AND ')
    : ''

  const results = await prisma.$queryRawUnsafe<Array<{
    material_type: string
    order_count: string
    total_units: string
    total_revenue: string
  }>>(`
    SELECT 
      CASE 
        WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' AND "productCode" NOT LIKE '%3SK%' THEN 'Zinc Plated'
        WHEN "productCode" LIKE '%3SK%' THEN 'Stainless Steel'
        WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Epoxy'
        ELSE 'Other'
      END as material_type,
      COUNT(DISTINCT "orderId") as order_count,
      SUM(COALESCE(CAST(quantity AS numeric), 0)) as total_units,
      SUM(amount) as total_revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE (oi."productCode" LIKE '01-63%'
           OR oi."productCode" IN ('82-5002.K', '82-5002.010')
           OR oi."productCode" LIKE '82-6002%'
           OR oi."productCode" LIKE '01-70%')
    AND o."orderDate" >= '${startDate.toISOString()}'
    ${additionalFilters}
    GROUP BY 
      CASE 
        WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' AND "productCode" NOT LIKE '%3SK%' THEN 'Zinc Plated'
        WHEN "productCode" LIKE '%3SK%' THEN 'Stainless Steel'
        WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Epoxy'
        ELSE 'Other'
      END
    ORDER BY total_revenue DESC
  `)
  return results
}

// Product line performance data
export async function getProductLineMetrics(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setDate(today.getDate() - days)
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setDate(currentPeriodStart.getDate() - days)

  // Build additional WHERE clauses for filters
  const filterClauses = []
  if (filters?.minAmount) {
    filterClauses.push(`o."totalAmount" >= ${filters.minAmount}`)
  }
  if (filters?.maxAmount) {
    filterClauses.push(`o."totalAmount" <= ${filters.maxAmount}`)
  }
  if (filters?.filterConsumer) {
    filterClauses.push(`
      NOT EXISTS (
        SELECT 1 FROM "Customer" c
        JOIN "Company" comp ON c."companyDomain" = comp."domain"
        WHERE c."id" = o."customerId"
        AND comp."domain" = ANY(ARRAY[${CONSUMER_DOMAINS.map(d => `'${d}'`).join(',')}])
      )
    `)
  }

  const additionalFilters = filterClauses.length > 0 
    ? 'AND ' + filterClauses.join(' AND ')
    : ''

  // Get metrics for both periods
  const metrics = await prisma.$queryRawUnsafe<(ProductLineMetric & { period: string })[]>(`
    SELECT 
      CASE 
        WHEN "productCode" LIKE '01-6310%' THEN 'SP10'
        WHEN "productCode" LIKE '01-6315%' THEN 'SP12'
        WHEN "productCode" LIKE '01-6318%' THEN 'SP18'
        WHEN "productCode" LIKE '01-6358%' THEN 'SP58'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010') OR "productCode" LIKE '82-6002%' THEN 'Adhesives'
        WHEN "productCode" LIKE '01-70%' THEN 'Kits'
        ELSE 'Other'
      END as product_line,
      COUNT(DISTINCT "orderId") as order_count,
      SUM(COALESCE(CAST(quantity AS numeric), 0)) as total_units,
      SUM(amount) as total_revenue,
      CASE 
        WHEN o."orderDate" >= '${currentPeriodStart.toISOString()}' THEN 'current'
        ELSE 'previous'
      END as period
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE (oi."productCode" LIKE '01-63%' 
           OR oi."productCode" IN ('82-5002.K', '82-5002.010')
           OR oi."productCode" LIKE '82-6002%'
           OR oi."productCode" LIKE '01-70%')
    AND o."orderDate" >= '${previousPeriodStart.toISOString()}'
    ${additionalFilters}
    GROUP BY 
      CASE 
        WHEN "productCode" LIKE '01-6310%' THEN 'SP10'
        WHEN "productCode" LIKE '01-6315%' THEN 'SP12'
        WHEN "productCode" LIKE '01-6318%' THEN 'SP18'
        WHEN "productCode" LIKE '01-6358%' THEN 'SP58'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010') OR "productCode" LIKE '82-6002%' THEN 'Adhesives'
        WHEN "productCode" LIKE '01-70%' THEN 'Kits'
        ELSE 'Other'
      END,
      CASE 
        WHEN o."orderDate" >= '${currentPeriodStart.toISOString()}' THEN 'current'
        ELSE 'previous'
      END
  `)

  // Combine current and previous period data
  const metricsByLine = metrics.reduce((acc, metric) => {
    if (!acc[metric.product_line]) {
      acc[metric.product_line] = {
        product_line: metric.product_line,
        current_revenue: "0",
        previous_revenue: "0",
        order_count: metric.order_count,
        total_units: metric.total_units,
        total_revenue: metric.total_revenue
      }
    }
    
    if (metric.period === 'current') {
      acc[metric.product_line].current_revenue = metric.total_revenue
    } else {
      acc[metric.product_line].previous_revenue = metric.total_revenue
    }
    
    return acc
  }, {} as Record<string, {
    product_line: string
    current_revenue: string
    previous_revenue: string
    order_count: string
    total_units: string
    total_revenue: string
  }>)

  // Convert to array, sort, and filter out 'Other' category
  const combinedMetrics = Object.values(metricsByLine)
    .filter(metric => metric.product_line !== 'Other')
    .sort((a, b) => Number(b.current_revenue) - Number(a.current_revenue))

  // Get product details
  const productDetails = await prisma.product.findMany({
    where: {
      OR: [
        { productCode: { startsWith: '01-6310' } }, // SP10
        { productCode: { startsWith: '01-6315' } }, // SP12
        { productCode: { startsWith: '01-6318' } }, // SP18
        { productCode: { startsWith: '01-6358' } }, // SP58
        { productCode: { in: ['82-5002.K', '82-5002.010'] } }, // EPX2
        { productCode: { startsWith: '82-6002' } }, // EPX3
        { productCode: { startsWith: '01-70' } }, // Kits
      ]
    },
    select: {
      productCode: true,
      name: true,
      description: true
    }
  })

  // Group products by product line
  const productsByLine = productDetails.reduce((acc, product) => {
    let line = 'Other'
    if (product.productCode.startsWith('01-6310')) line = 'SP10'
    else if (product.productCode.startsWith('01-6315')) line = 'SP12'
    else if (product.productCode.startsWith('01-6318')) line = 'SP18'
    else if (product.productCode.startsWith('01-6358')) line = 'SP58'
    else if (['82-5002.K', '82-5002.010'].includes(product.productCode) || product.productCode.startsWith('82-6002')) line = 'Adhesives'
    else if (product.productCode.startsWith('01-70')) line = 'Kits'

    if (!acc[line]) acc[line] = []
    acc[line].push(product)
    return acc
  }, {} as Record<string, ProductDetail[]>)

  // Combine metrics with product details
  return combinedMetrics.map(metric => ({
    ...metric,
    products: productsByLine[metric.product_line] || []
  }))
}

// Sales channel insights data
export async function getSalesChannelMetrics(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  
  // Create 4 periods
  const periodStarts = Array.from({ length: 4 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - days * (i + 1))
    return date
  })
  
  const periodEnds = [today, ...periodStarts.slice(0, -1)]

  // Build additional WHERE clauses for filters
  const filterClauses = []
  if (filters?.minAmount) {
    filterClauses.push(`o."totalAmount" >= ${filters.minAmount}`)
  }
  if (filters?.maxAmount) {
    filterClauses.push(`o."totalAmount" <= ${filters.maxAmount}`)
  }
  if (filters?.filterConsumer) {
    filterClauses.push(`
      NOT EXISTS (
        SELECT 1 FROM "Customer" c
        JOIN "Company" comp ON c."companyDomain" = comp."domain"
        WHERE c."id" = o."customerId"
        AND comp."domain" = ANY(ARRAY[${CONSUMER_DOMAINS.map(d => `'${d}'`).join(',')}])
      )
    `)
  }

  const additionalFilters = filterClauses.length > 0 
    ? 'AND ' + filterClauses.join(' AND ')
    : ''

  const results = await prisma.$queryRawUnsafe<Array<{
    sales_channel: string
    order_count: string
    total_units: string
    total_revenue: string
    avg_unit_price: string
    period_index: number
    period_start: string
    period_end: string
  }>>(`
    WITH periods AS (
      ${periodStarts.map((start, i) => `
        SELECT 
          ${i} as period_index,
          CAST('${start.toISOString()}' AS timestamp) as period_start,
          CAST('${periodEnds[i].toISOString()}' AS timestamp) as period_end
      `).join(' UNION ALL ')}
    )
    SELECT 
      COALESCE(o.class, 'Unclassified') as sales_channel,
      COALESCE(COUNT(DISTINCT "orderId"), 0) as order_count,
      COALESCE(SUM(COALESCE(CAST(quantity AS numeric), 0)), 0) as total_units,
      COALESCE(SUM(amount), 0) as total_revenue,
      COALESCE(SUM(amount) / NULLIF(COUNT(DISTINCT "orderId"), 0), 0) as avg_unit_price,
      p.period_index,
      CAST(p.period_start AS text) as period_start,
      CAST(p.period_end AS text) as period_end
    FROM periods p
    LEFT JOIN "Order" o ON o."orderDate" >= p.period_start AND o."orderDate" < p.period_end
    LEFT JOIN "OrderItem" oi ON oi."orderId" = o."id"
    WHERE (oi."productCode" LIKE '01-63%'
           OR oi."productCode" IN ('82-5002.K', '82-5002.010')
           OR oi."productCode" LIKE '82-6002%'
           OR oi."productCode" LIKE '01-70%')
    ${additionalFilters}
    GROUP BY 
      COALESCE(o.class, 'Unclassified'),
      p.period_index,
      p.period_start,
      p.period_end
    ORDER BY
      sales_channel,
      period_index
  `)

  // Transform results into the new format
  const metricsByChannel = results.reduce((acc, metric) => {
    if (!acc[metric.sales_channel]) {
      acc[metric.sales_channel] = {
        sales_channel: metric.sales_channel,
        periods: Array(4).fill({
          order_count: "0",
          total_units: "0",
          total_revenue: "0",
          avg_unit_price: "0"
        })
      }
    }

      acc[metric.sales_channel].periods[metric.period_index] = {
        order_count: String(metric.order_count),
        total_units: String(metric.total_units),
        total_revenue: String(metric.total_revenue),
        avg_unit_price: String(metric.avg_unit_price),
        period_start: metric.period_start || new Date(periodStarts[metric.period_index]).toISOString(),
        period_end: metric.period_end || new Date(periodEnds[metric.period_index]).toISOString()
      }

    return acc
  }, {} as Record<string, SalesChannelMetric>)

  return Object.values(metricsByChannel)
}

export async function getCanadianUnitsSold(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)
  
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
