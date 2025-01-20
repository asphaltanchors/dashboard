import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

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
        quickbooksId: true,
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
    quickbooksId: order.quickbooksId,
  }))

  return {
    orders: mappedOrders,
    totalCount,
    recentCount
  }
}

export type Order = Awaited<ReturnType<typeof getOrders>>['orders'][number]

export async function getOrderByQuickbooksId(quickbooksId: string) {
  const order = await prisma.order.findFirst({
    where: {
      quickbooksId
    },
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      customer: {
        select: {
          customerName: true,
          company: {
            select: {
              name: true
            }
          }
        }
      },
      status: true,
      paymentStatus: true,
      totalAmount: true,
      subtotal: true,
      taxAmount: true,
      dueDate: true,
      paymentMethod: true,
      paymentDate: true,
      poNumber: true,
      items: {
        select: {
          product: {
            select: {
              name: true,
              productCode: true
            }
          },
          quantity: true,
          unitPrice: true,
          amount: true,
          description: true,
          serviceDate: true
        }
      },
      billingAddress: {
        select: {
          line1: true,
          line2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true
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
  })

  if (!order) {
    notFound()
  }

  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    items: order.items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount)
    }))
  }
}
