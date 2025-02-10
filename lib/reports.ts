import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { CONSUMER_DOMAINS } from "@/lib/companies"

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

// Product line performance data
export async function getProductLineMetrics() {
  const today = new Date()
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setMonth(today.getMonth() - 12)
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setMonth(currentPeriodStart.getMonth() - 12)

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
  }, {} as Record<string, any>)

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

// Material type analysis data
export async function getMaterialTypeMetrics() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(today.getMonth() - 12)

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

// Sales channel insights data
export async function getSalesChannelMetrics() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(today.getMonth() - 12)

  const results = await prisma.$queryRawUnsafe<Array<{
    sales_channel: string
    order_count: string
    total_units: string
    total_revenue: string
    avg_unit_price: string
  }>>(`
    SELECT 
      CASE 
        WHEN "productCode" LIKE '%-FBA' THEN 'FBA'
        ELSE 'Direct'
      END as sales_channel,
      COUNT(DISTINCT "orderId") as order_count,
      SUM(COALESCE(CAST(quantity AS numeric), 0)) as total_units,
      SUM(amount) as total_revenue,
      AVG(amount / NULLIF(COALESCE(CAST(quantity AS numeric), 0), 0)) as avg_unit_price
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE (oi."productCode" LIKE '01-63%'
           OR oi."productCode" IN ('82-5002.K', '82-5002.010')
           OR oi."productCode" LIKE '82-6002%'
           OR oi."productCode" LIKE '01-70%')
    AND o."orderDate" >= '${startDate.toISOString()}'
    GROUP BY 
      CASE 
        WHEN "productCode" LIKE '%-FBA' THEN 'FBA'
        ELSE 'Direct'
      END
  `)
  return results
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

export async function getCanadianSalesMetrics() {
  const today = new Date()
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setMonth(today.getMonth() - 12)
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setMonth(currentPeriodStart.getMonth() - 12)

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

  // Then get their orders
  const orders = await prisma.order.findMany({
    where: {
      customerId: {
        in: canadianCustomers.map(c => c.id)
      },
      orderDate: {
        gte: previousPeriodStart
      }
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
      label: "Last 12 Months",
      ...currentMetrics
    },
    previousPeriod: {
      label: "Previous 12 Months",
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

export async function getCanadianTopCustomers() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(today.getMonth() - 12)
  
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
          }
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
          }
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

export async function getCanadianOrders() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(today.getMonth() - 12)
  
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

  // Then get their orders
  const orders = await prisma.order.findMany({
    where: {
      customerId: {
        in: canadianCustomers.map(c => c.id)
      },
      orderDate: {
        gte: startDate
      }
    },
    include: {
      customer: {
        select: {
          customerName: true
        }
      }
    }
  })

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
    totalCount: orders.length,
    recentCount: orders.length
  }
}

export async function getCanadianUnitsSold() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(today.getMonth() - 12)
  
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

  // Then get their orders
  const orders = await prisma.order.findMany({
    where: {
      customerId: {
        in: canadianCustomers.map(c => c.id)
      },
      orderDate: {
        gte: startDate
      }
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

export async function getCompanyOrderMetrics(monthsWindow = 6) {
  const today = new Date()
  const windowStart = new Date(today)
  windowStart.setMonth(today.getMonth() - monthsWindow)
  const previousStart = new Date(windowStart)
  previousStart.setMonth(windowStart.getMonth() - monthsWindow)

  // Get orders for current period
  const currentPeriodOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: windowStart
      }
    },
    select: {
      id: true,
      totalAmount: true,
      customer: {
        select: {
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

  // Get orders for previous period
  const previousPeriodOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: previousStart,
        lt: windowStart
      }
    },
    select: {
      id: true,
      totalAmount: true,
      customer: {
        select: {
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

  // Aggregate orders by company
  const companyMetrics = new Map<string, {
    id: string,
    name: string | null,
    domain: string,
    currentTotal: number,
    previousTotal: number
  }>()

  // Process current period orders
  currentPeriodOrders.forEach(order => {
    if (!order.customer.company) return
    const company = order.customer.company
    const existing = companyMetrics.get(company.id) || {
      id: company.id,
      name: company.name,
      domain: company.domain,
      currentTotal: 0,
      previousTotal: 0
    }
    existing.currentTotal += Number(order.totalAmount)
    companyMetrics.set(company.id, existing)
  })

  // Process previous period orders
  previousPeriodOrders.forEach(order => {
    if (!order.customer.company) return
    const company = order.customer.company
    const existing = companyMetrics.get(company.id) || {
      id: company.id,
      name: company.name,
      domain: company.domain,
      currentTotal: 0,
      previousTotal: 0
    }
    existing.previousTotal += Number(order.totalAmount)
    companyMetrics.set(company.id, existing)
  })

  // Convert to array and calculate percentages
  const results = Array.from(companyMetrics.values())
    .map(company => ({
      ...company,
      percentageChange: company.previousTotal > 0 
        ? ((company.currentTotal - company.previousTotal) / company.previousTotal * 100)
        : 0
    }))
    .sort((a, b) => b.percentageChange - a.percentageChange)

  // Calculate summary metrics
  const increasingCompanies = results.filter(c => c.percentageChange > 0)
  const decreasingCompanies = results.filter(c => c.percentageChange < 0)

  return {
    companies: results,
    summary: {
      increasingCount: increasingCompanies.length,
      averageIncrease: increasingCompanies.length > 0
        ? increasingCompanies.reduce((sum, c) => sum + c.percentageChange, 0) / increasingCompanies.length
        : 0,
      decreasingCount: decreasingCompanies.length,
      averageDecrease: decreasingCompanies.length > 0
        ? decreasingCompanies.reduce((sum, c) => sum + c.percentageChange, 0) / decreasingCompanies.length
        : 0
    }
  }
}

export async function getAdhesiveMetrics(filterConsumer = true) {
  // Get the correctly filtered list of adhesive-only customers first
  const adhesiveOnlyCustomers = await getAdhesiveOnlyCustomers(filterConsumer)
  const customerIds = adhesiveOnlyCustomers.map(c => c.id)

  const today = new Date()
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1)
  const twentyFourMonthsAgo = new Date(twelveMonthsAgo)
  twentyFourMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  // Get orders for last 12 months from adhesive-only customers
  const recentOrders = await prisma.order.findMany({
    where: {
      customerId: {
        in: customerIds
      },
      orderDate: {
        gte: twelveMonthsAgo
      }
    },
    select: {
      id: true,
      items: {
        where: {
          productCode: {
            in: ADHESIVE_PRODUCT_CODES
          }
        },
        select: {
          amount: true
        }
      }
    }
  })

  // Get orders for previous 12 months from adhesive-only customers
  const previousOrders = await prisma.order.findMany({
    where: {
      customerId: {
        in: customerIds
      },
      orderDate: {
        gte: twentyFourMonthsAgo,
        lt: twelveMonthsAgo
      }
    },
    select: {
      id: true,
      items: {
        where: {
          productCode: {
            in: ADHESIVE_PRODUCT_CODES
          }
        },
        select: {
          amount: true
        }
      }
    }
  })

  const recentTotal = recentOrders.reduce((total, order) =>
    total + order.items.reduce((orderTotal, item) => orderTotal + Number(item.amount), 0), 0
  )
  const previousTotal = previousOrders.reduce((total, order) => 
    total + order.items.reduce((orderTotal, item) => orderTotal + Number(item.amount), 0), 0
  )

  const recentAvg = recentTotal / (recentOrders.length || 1)
  const previousAvg = previousTotal / (previousOrders.length || 1)

  return {
    orderCount: {
      current: recentOrders.length,
      change: previousOrders.length ? 
        ((recentOrders.length - previousOrders.length) / previousOrders.length * 100).toFixed(1) : 
        "0.0"
    },
    totalSpent: {
      current: recentTotal,
      change: previousTotal ? 
        ((recentTotal - previousTotal) / previousTotal * 100).toFixed(1) : 
        "0.0"
    },
    averageOrder: {
      current: recentAvg,
      change: previousAvg ? 
        ((recentAvg - previousAvg) / previousAvg * 100).toFixed(1) : 
        "0.0"
    }
  }
}

export async function getAdhesiveOnlyCustomers(filterConsumer = true) {
  // Find customers who have only ordered adhesive products
  const customers = await prisma.customer.findMany({
    where: {
      orders: {
        some: {
          items: {
            some: {
              productCode: {
                in: ADHESIVE_PRODUCT_CODES
              }
            }
          }
        },
        // Ensure no orders contain non-adhesive products
        none: {
          items: {
            some: {
              AND: [
                {
                  productCode: {
                    notIn: ADHESIVE_PRODUCT_CODES
                  }
                },
                {
                  productCode: {
                    notIn: ['SYS-SHIPPING', 'SYS-NJ-TAX', 'SYS-DISCOUNT']
                  }
                }
              ]
            }
          }
        }
      }
    },
    select: {
      id: true,
      customerName: true,
      company: {
        select: {
          name: true,
          domain: true,
          enriched: true,
          enrichedSource: true
        }
      },
      orders: {
        where: {
          items: {
            some: {
              productCode: {
                in: ADHESIVE_PRODUCT_CODES
              }
            }
          }
        },
        select: {
          id: true,
          orderNumber: true,
          items: {
            where: {
              productCode: {
                in: ADHESIVE_PRODUCT_CODES
              }
            },
            select: {
              amount: true
            }
          }
        }
      }
    }
  })

  // Filter out consumer domains if requested
  const filteredCustomers = filterConsumer 
    ? customers.filter(customer => {
        // Keep companies that are enriched from a business source
        if (customer.company?.enriched && customer.company.enrichedSource !== 'hunter') {
          return true
        }
        // Filter out consumer domains
        const domain = customer.company?.domain?.toLowerCase()
        if (!domain) return true
        return !CONSUMER_DOMAINS.some((consumerDomain: string) => domain.endsWith(consumerDomain))
      })
    : customers

  return filteredCustomers.map(customer => ({
    id: customer.id,
    customerName: customer.customerName,
    companyName: customer.company?.name ?? null,
    companyDomain: customer.company?.domain ?? null,
    orderCount: customer.orders.length,
    orders: customer.orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber
    })),
    totalSpent: customer.orders.reduce((total, order) => 
      total + order.items.reduce((orderTotal, item) => 
        orderTotal + Number(item.amount), 0
      ), 0
    )
  }))
}
