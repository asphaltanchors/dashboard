import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { CONSUMER_DOMAINS } from "@/lib/companies"

function getDateRangeFromFilter(dateRange: string = "365d"): { start: Date, end: Date } {
  const end = new Date()
  const start = new Date()
  const days = parseInt(dateRange.replace("d", ""))
  start.setDate(start.getDate() - days)
  return { start, end }
}

interface FilterParams {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

type OrderWhereClause = Prisma.OrderWhereInput

export async function getOrderMetrics(filters: FilterParams = {}) {
  return getPeriodMetrics(filters)
}

async function getPeriodMetrics({ dateRange = "365d", minAmount, maxAmount, filterConsumer = false }: FilterParams = {}) {
  const { start: periodStart, end: periodEnd } = getDateRangeFromFilter(dateRange)
  
  // Same period last year
  const lastYearStart = new Date(periodStart)
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
  const lastYearEnd = new Date(periodEnd)
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

  // Build where clause
  const whereClause: OrderWhereClause = {
    orderDate: {
      gte: periodStart,
      lte: periodEnd
    },
    customer: filterConsumer ? {
      company: {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      }
    } : {}
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(minAmount !== undefined && { gte: minAmount }),
      ...(maxAmount !== undefined && { lte: maxAmount })
    }
  }

  // Current period orders
  const currentOrders = await prisma.order.findMany({
    where: whereClause,
    select: {
      totalAmount: true
    }
  })

  // Same period last year orders with same filters
  const previousOrders = await prisma.order.findMany({
    where: {
      ...whereClause,
      orderDate: {
        gte: lastYearStart,
        lte: lastYearEnd
      }
    },
    select: {
      totalAmount: true
    }
  })

  const currentTotalOrders = currentOrders.length
  const previousTotalOrders = previousOrders.length
  const orderChange = ((currentTotalOrders - previousTotalOrders) / previousTotalOrders * 100).toFixed(1)

  const currentTotalSales = currentOrders.reduce((sum: number, order) =>
    sum + Number(order.totalAmount.toString()), 0)
  const previousTotalSales = previousOrders.reduce((sum: number, order) =>
    sum + Number(order.totalAmount.toString()), 0)
  const salesChange = ((currentTotalSales - previousTotalSales) / previousTotalSales * 100).toFixed(1)

  return {
    currentTotalOrders,
    orderChange,
    currentTotalSales,
    salesChange
  }
}

export async function getPaymentMethodMetrics({ dateRange = "365d", minAmount, maxAmount, filterConsumer = false }: FilterParams = {}) {
  const { start } = getDateRangeFromFilter(dateRange)

  const whereClause: OrderWhereClause = {
    orderDate: {
      gte: start,
      lte: new Date()
    },
    paymentMethod: {
      not: null
    },
    customer: filterConsumer ? {
      company: {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      }
    } : {}
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(minAmount !== undefined && { gte: minAmount }),
      ...(maxAmount !== undefined && { lte: maxAmount })
    }
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      paymentMethod: true,
      totalAmount: true
    }
  })

  const metrics = orders.reduce((acc: { [key: string]: number }, order) => {
    const method = order.paymentMethod || 'Unknown'
    acc[method] = (acc[method] || 0) + Number(order.totalAmount.toString())
    return acc
  }, {})

  return Object.entries(metrics)
    .map(([method, amount]) => ({
      method,
      amount
    }))
    .sort((a, b) => b.amount - a.amount)
}

export async function getClassMetrics({ dateRange = "365d", minAmount, maxAmount, filterConsumer = false }: FilterParams = {}) {
  const { start } = getDateRangeFromFilter(dateRange)

  const whereClause: OrderWhereClause = {
    orderDate: {
      gte: start,
      lte: new Date()
    },
    class: {
      not: null
    },
    customer: filterConsumer ? {
      company: {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      }
    } : {}
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(minAmount !== undefined && { gte: minAmount }),
      ...(maxAmount !== undefined && { lte: maxAmount })
    }
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      totalAmount: true,
      class: true,
      orderNumber: true,
      orderDate: true
    }
  })

  const metrics = orders.reduce((acc: { [key: string]: number }, order) => {
    const className = order.class || 'Unclassified'
    acc[className] = (acc[className] || 0) + Number(order.totalAmount.toString())
    return acc
  }, {})

  return Object.entries(metrics)
    .map(([className, amount]) => ({
      class: className,
      amount
    }))
    .sort((a, b) => b.amount - a.amount)
}

export async function getMonthlyRevenue(filters: FilterParams = {}) {
  // Calculate date 18 months ago
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 17) // -17 to include current month (total 18)
  start.setDate(1) // Start from beginning of month
  
  // Build where clause similar to other functions
  const whereClause: OrderWhereClause = {
    orderDate: {
      gte: start,
      lte: end
    },
    customer: filters.filterConsumer ? {
      company: {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      }
    } : {}
  }
  
  // Add amount filters if provided
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(filters.minAmount !== undefined && { gte: filters.minAmount }),
      ...(filters.maxAmount !== undefined && { lte: filters.maxAmount })
    }
  }
  
  // Get all orders in the date range with class information
  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      orderDate: true,
      totalAmount: true,
      class: true
    }
  })
  
  // Group by month and calculate revenue by class
  const monthlyData = orders.reduce((acc, order) => {
    const date = order.orderDate
    const month = date.getMonth()
    const year = date.getFullYear()
    const key = `${year}-${month}`
    const className = order.class || 'Unclassified'
    const amount = Number(order.totalAmount.toString())
    
    if (!acc[key]) {
      acc[key] = {
        month,
        year,
        classTotals: {},
        revenue: 0 // Keep total revenue for backward compatibility
      }
    }
    
    // Add to class total
    acc[key].classTotals[className] = (acc[key].classTotals[className] || 0) + amount
    
    // Also update total revenue for backward compatibility
    acc[key].revenue += amount
    
    return acc
  }, {} as Record<string, { 
    month: number; 
    year: number; 
    classTotals: Record<string, number>;
    revenue: number; 
  }>)
  
  // Convert to array and sort by date
  return Object.values(monthlyData)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })
}

export async function getQuarterlyRevenue(filters: FilterParams = {}) {
  // Get all orders from the beginning of time
  const whereClause: OrderWhereClause = {
    customer: filters.filterConsumer ? {
      company: {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      }
    } : {}
  }
  
  // Add amount filters if provided
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(filters.minAmount !== undefined && { gte: filters.minAmount }),
      ...(filters.maxAmount !== undefined && { lte: filters.maxAmount })
    }
  }
  
  // Get all orders
  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      orderDate: true,
      totalAmount: true
    }
  })
  
  // Get current date to determine current quarter
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1
  
  // Group by quarter and calculate total revenue
  const quarterlyData = orders.reduce((acc, order) => {
    const date = order.orderDate
    const month = date.getMonth()
    const year = date.getFullYear()
    const quarter = Math.floor(month / 3) + 1
    const key = `${year}-Q${quarter}`
    
    // Skip current quarter as it's incomplete
    if (year === currentYear && quarter === currentQuarter) {
      return acc
    }
    
    if (!acc[key]) {
      acc[key] = {
        quarter,
        year,
        revenue: 0,
        label: `Q${quarter} ${year}`
      }
    }
    
    acc[key].revenue += Number(order.totalAmount.toString())
    return acc
  }, {} as Record<string, { quarter: number; year: number; revenue: number; label: string }>)
  
  // Convert to array and sort by date
  return Object.values(quarterlyData)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.quarter - b.quarter
    })
}

export async function getAnnualRevenue(filters: FilterParams = {}) {
  // Get all orders from the beginning of time
  const whereClause: OrderWhereClause = {
    customer: filters.filterConsumer ? {
      company: {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      }
    } : {}
  }
  
  // Add amount filters if provided
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(filters.minAmount !== undefined && { gte: filters.minAmount }),
      ...(filters.maxAmount !== undefined && { lte: filters.maxAmount })
    }
  }
  
  // Get all orders
  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      orderDate: true,
      totalAmount: true
    }
  })
  
  // Get current date to determine current year
  const now = new Date()
  const currentYear = now.getFullYear()
  
  // Group by year and calculate total revenue
  const annualData = orders.reduce((acc, order) => {
    const date = order.orderDate
    const year = date.getFullYear()
    const key = `${year}`
    
    // Skip current year as it's incomplete
    if (year === currentYear) {
      return acc
    }
    
    if (!acc[key]) {
      acc[key] = {
        year,
        revenue: 0,
        label: `${year}`
      }
    }
    
    acc[key].revenue += Number(order.totalAmount.toString())
    return acc
  }, {} as Record<string, { year: number; revenue: number; label: string }>)
  
  // Convert to array and sort by year
  return Object.values(annualData)
    .sort((a, b) => a.year - b.year)
}

export async function getRecentOrders({ 
  minAmount, 
  maxAmount,
  page = 1,
  pageSize = 10,
  sortColumn = 'orderDate',
  sortDirection = 'desc',
  searchTerm = '',
  dateRange,
  filterConsumer = false
}: FilterParams & {
  page?: number,
  pageSize?: number,
  sortColumn?: string,
  sortDirection?: 'asc' | 'desc',
  searchTerm?: string,
  dateRange?: string,
  filterConsumer?: boolean
} = {}) {
  const whereClause: OrderWhereClause = {
    customer: filterConsumer ? {
      company: {
        domain: {
          not: {
            in: CONSUMER_DOMAINS
          }
        }
      }
    } : {}
  }

  // Handle date range filter
  if (dateRange) {
    const { start, end } = getDateRangeFromFilter(dateRange)
    whereClause.orderDate = {
      gte: start,
      lte: end
    }
  }

  // Handle amount filters
  if (minAmount !== undefined || maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(minAmount !== undefined && { gte: minAmount }),
      ...(maxAmount !== undefined && { lte: maxAmount })
    }
  }

  // Handle search term
  if (searchTerm) {
    whereClause.OR = [
      { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
      { customer: { customerName: { contains: searchTerm, mode: 'insensitive' } } }
    ]
  }

  const [totalCount, rawOrders] = await Promise.all([
    prisma.order.count({ where: whereClause }),
    prisma.order.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortColumn]: sortDirection
      },
      include: {
        customer: {
          select: {
            customerName: true,
            emails: {
              where: { isPrimary: true },
              select: { email: true },
              take: 1
            }
          }
        }
      }
    })
  ])

  // Transform orders to match TableData structure
  const orders = rawOrders.map(order => ({
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
    orders,
    totalCount,
    recentCount: orders.length
  }
}
