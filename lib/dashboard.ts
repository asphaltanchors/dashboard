import { prisma } from "@/lib/prisma"

export async function getOrderMetrics() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  // Current period orders
  const currentOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: thirtyDaysAgo
      }
    },
    select: {
      totalAmount: true
    }
  })

  // Previous period orders
  const previousOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: sixtyDaysAgo,
        lt: thirtyDaysAgo
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
