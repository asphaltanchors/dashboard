import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

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
}

type OrderWhereClause = Prisma.OrderWhereInput

export async function getOrderMetrics(filters: FilterParams = {}) {
  const [periodMetrics, annualMetrics] = await Promise.all([
    getPeriodMetrics(filters),
    getAnnualMetrics(filters)
  ])

  return {
    ...periodMetrics,
    ...annualMetrics
  }
}

async function getPeriodMetrics({ dateRange = "365d", minAmount, maxAmount }: FilterParams = {}) {
  const { start: periodStart, end: periodEnd } = getDateRangeFromFilter(dateRange)
  
  // Same period last year
  const lastYearStart = new Date(periodStart)
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
  const lastYearEnd = new Date(periodEnd)
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

  // Build where clause
  const whereClause: OrderWhereClause = {
    orderDate: {
      gte: periodStart
    }
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

async function getAnnualMetrics({ minAmount, maxAmount }: FilterParams = {}) {
  const today = new Date()
  
  // Current 12 months
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1)
  
  // Previous 12 months
  const twentyFourMonthsAgo = new Date(twelveMonthsAgo)
  twentyFourMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  // Build where clause
  const whereClause: OrderWhereClause = {}

  if (minAmount !== undefined || maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(minAmount !== undefined && { gte: minAmount }),
      ...(maxAmount !== undefined && { lte: maxAmount })
    }
  }

  // Current period orders (last 12 months)
  const currentAnnualOrders = await prisma.order.findMany({
    where: {
      ...whereClause,
      orderDate: {
        gte: twelveMonthsAgo
      }
    },
    select: {
      totalAmount: true
    }
  })

  // Previous period orders (12 months before that)
  const previousAnnualOrders = await prisma.order.findMany({
    where: {
      ...whereClause,
      orderDate: {
        gte: twentyFourMonthsAgo,
        lt: twelveMonthsAgo
      }
    },
    select: {
      totalAmount: true
    }
  })

  const currentAnnualSales = currentAnnualOrders.reduce((sum: number, order) =>
    sum + Number(order.totalAmount.toString()), 0)
  const previousAnnualSales = previousAnnualOrders.reduce((sum: number, order) =>
    sum + Number(order.totalAmount.toString()), 0)
  const annualSalesChange = ((currentAnnualSales - previousAnnualSales) / previousAnnualSales * 100).toFixed(1)

  return {
    currentAnnualSales,
    annualSalesChange
  }
}

export async function getPaymentMethodMetrics({ dateRange = "365d", minAmount, maxAmount }: FilterParams = {}) {
  const { start } = getDateRangeFromFilter(dateRange)

  const whereClause: OrderWhereClause = {
    orderDate: {
      gte: start
    },
    paymentMethod: {
      not: null
    }
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

export async function getClassMetrics({ dateRange = "365d", minAmount, maxAmount }: FilterParams = {}) {
  const { start } = getDateRangeFromFilter(dateRange)

  const whereClause: OrderWhereClause = {
    orderDate: {
      gte: start
    },
    class: {
      not: null
    }
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

export async function getRecentOrders({ minAmount, maxAmount }: FilterParams = {}) {
  const whereClause: OrderWhereClause = {}

  if (minAmount !== undefined || maxAmount !== undefined) {
    whereClause.totalAmount = {
      ...(minAmount !== undefined && { gte: minAmount }),
      ...(maxAmount !== undefined && { lte: maxAmount })
    }
  }

  return await prisma.order.findMany({
    where: whereClause,
    take: 10,
    orderBy: {
      orderDate: 'desc'
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
}
