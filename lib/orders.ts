import { prisma } from "@/lib/prisma"

export type Order = {
  id: string
  orderNumber: string
  orderDate: Date
  customerName: string
  status: string
  paymentStatus: string
  totalAmount: number
  dueDate: Date | null
  paymentMethod: string | null
}

export async function getOrders() {
  const orders = await prisma.order.findMany({
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
  })

  return orders.map((order) => ({
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
}
