import { prisma } from "@/lib/prisma"

export async function getOrders() {
  const [orders, totalCount, recentCount] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        customer: {
          select: {
            customerName: true,
          },
        },
        status: true,
        paymentStatus: true,
        totalAmount: true,
        dueDate: true,
        paymentMethod: true,
      },
      orderBy: {
        orderDate: "desc",
      },
    }),
    prisma.order.count(),
    prisma.order.count({
      where: {
        orderDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
  ])

  const mappedOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    customerName: order.customer.customerName,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount),
    dueDate: order.dueDate,
    paymentMethod: order.paymentMethod,
  }))

  return {
    orders: mappedOrders,
    totalCount,
    recentCount
  }
}

export type Order = Awaited<ReturnType<typeof getOrders>>['orders'][number]
