import { prisma } from "@/lib/prisma"

export async function getOrderMetrics() {
  const [thirtyDayMetrics, annualMetrics] = await Promise.all([
    getThirtyDayMetrics(),
    getAnnualMetrics()
  ])

  return {
    ...thirtyDayMetrics,
    ...annualMetrics
  }
}

async function getThirtyDayMetrics() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // Same period last year
  const lastYearStart = new Date(thirtyDaysAgo)
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
  const lastYearEnd = new Date(today)
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

  // Current period orders
  const currentOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: thirtyDaysAgo
      },
      status: 'CLOSED'
    },
    select: {
      totalAmount: true
    }
  })

  // Same period last year orders
  const previousOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: lastYearStart,
        lte: lastYearEnd
      },
      status: 'CLOSED'
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

async function getAnnualMetrics() {
  const today = new Date()
  
  // Current 12 months
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1)
  
  // Previous 12 months
  const twentyFourMonthsAgo = new Date(twelveMonthsAgo)
  twentyFourMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  // Current period orders (last 12 months)
  const currentAnnualOrders = await prisma.order.findMany({
    where: {
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

export async function getPaymentMethodMetrics() {
  const today = new Date()
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1)

  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: twelveMonthsAgo
      },
      paymentMethod: {
        not: null
      }
    },
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

export async function getClassMetrics() {
  const today = new Date()
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1)

  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: twelveMonthsAgo
      },
      class: {
        not: null
      }
    },
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

export async function getRecentOrders() {
  return await prisma.order.findMany({
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
