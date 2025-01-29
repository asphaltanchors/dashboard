import { prisma } from "@/lib/prisma"
import { CONSUMER_DOMAINS } from "@/lib/companies"

const ADHESIVE_PRODUCT_CODES = [
  // EPX2 products
  '82-5002.36L',
  '82-5002.40L',
  '82-5002.K',
  '82-5002.K-FBA',
  '82-5002.010',
  // EPX3 products
  '82-6002',
  '82-6002 IN',
  '82-6002 DTH',
  '82-6002.420',
  // EPX5 products
  '82-6005'
]

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
  const today = new Date()
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1)
  const twentyFourMonthsAgo = new Date(twelveMonthsAgo)
  twentyFourMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  // Get orders for last 12 months
  const recentOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: twelveMonthsAgo
      },
      items: {
        some: {
          productCode: {
            in: ADHESIVE_PRODUCT_CODES
          }
        }
      },
      // Ensure no orders contain non-adhesive products
      NOT: {
        items: {
          some: {
            productCode: {
              notIn: ADHESIVE_PRODUCT_CODES
            }
          }
        }
      }
    },
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          amount: true
        }
      },
      customer: {
        select: {
          company: {
            select: {
              domain: true,
              enriched: true,
              enrichedSource: true
            }
          }
        }
      }
    }
  })

  // Get orders for previous 12 months
  const previousOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: twentyFourMonthsAgo,
        lt: twelveMonthsAgo
      },
      items: {
        some: {
          productCode: {
            in: ADHESIVE_PRODUCT_CODES
          }
        }
      },
      // Ensure no orders contain non-adhesive products
      NOT: {
        items: {
          some: {
            productCode: {
              notIn: ADHESIVE_PRODUCT_CODES
            }
          }
        }
      }
    },
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          amount: true
        }
      },
      customer: {
        select: {
          company: {
            select: {
              domain: true,
              enriched: true,
              enrichedSource: true
            }
          }
        }
      }
    }
  })

  // Filter orders based on consumer domains
  const filterOrder = (order: typeof recentOrders[0]) => {
    if (!filterConsumer) return true
    const company = order.customer.company
    if (!company) return true
    
    // Keep companies that are enriched from a business source
    if (company.enriched && company.enrichedSource !== 'hunter') {
      return true
    }
    
    // Filter out consumer domains
    const domain = company.domain?.toLowerCase()
    if (!domain) return true
    return !CONSUMER_DOMAINS.some((consumerDomain: string) => domain.endsWith(consumerDomain))
  }

  const filteredRecentOrders = recentOrders.filter(filterOrder)
  const filteredPreviousOrders = previousOrders.filter(filterOrder)

  const recentTotal = filteredRecentOrders.reduce((total, order) => 
    total + order.items.reduce((orderTotal, item) => orderTotal + Number(item.amount), 0), 0
  )
  const previousTotal = filteredPreviousOrders.reduce((total, order) => 
    total + order.items.reduce((orderTotal, item) => orderTotal + Number(item.amount), 0), 0
  )

  const recentAvg = recentTotal / (filteredRecentOrders.length || 1)
  const previousAvg = previousTotal / (filteredPreviousOrders.length || 1)

  return {
    orderCount: {
      current: filteredRecentOrders.length,
      change: filteredPreviousOrders.length ? 
        ((filteredRecentOrders.length - filteredPreviousOrders.length) / filteredPreviousOrders.length * 100).toFixed(1) : 
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
              productCode: {
                notIn: ADHESIVE_PRODUCT_CODES
              }
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
