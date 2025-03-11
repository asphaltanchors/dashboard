import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Prisma } from "@prisma/client"

interface GetOrdersParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  paymentStatusFilter?: 'unpaid-only' | null
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

export async function getOrders({
  page = 1,
  pageSize = 10,
  searchTerm = '',
  sortColumn = 'orderDate',
  sortDirection = 'desc',
  paymentStatusFilter = null,
  dateRange = '365d',
  minAmount,
  maxAmount,
  filterConsumer = false
}: GetOrdersParams = {}) {
  // Calculate pagination
  const skip = (page - 1) * pageSize

  // Build where clause for search and filters
  const where: Prisma.OrderWhereInput = {}
  
  // Search filter
  if (searchTerm) {
    where.OR = [
      { orderNumber: { contains: searchTerm, mode: 'insensitive' as const } },
      { 
        customer: {
          customerName: { contains: searchTerm, mode: 'insensitive' as const }
        }
      }
    ]
  }

  // Payment status filter
  if (paymentStatusFilter === 'unpaid-only') {
    where.paymentStatus = { in: ['UNPAID', 'PARTIAL'] }
  }

  // Date range filter
  if (dateRange) {
    const days = parseInt(dateRange.replace('d', ''))
    where.orderDate = {
      gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      lte: new Date()
    }
  }

  // Amount filters
  if (minAmount !== undefined || maxAmount !== undefined) {
    where.totalAmount = {
      ...(minAmount !== undefined && { gte: minAmount }),
      ...(maxAmount !== undefined && { lte: maxAmount })
    }
  }

  // Consumer domain filter
  if (filterConsumer) {
    where.customer = {
      company: {
        NOT: {
          domain: {
            endsWith: '.edu'
          }
        }
      }
    }
  }

  // Build order by object dynamically
  let orderBy: Prisma.OrderOrderByWithRelationInput = {}
  if (sortColumn === 'customerName') {
    orderBy = {
      customer: {
        customerName: sortDirection
      }
    }
  } else if (sortColumn === 'orderDate') {
    orderBy = { orderDate: sortDirection }
  } else if (sortColumn === 'orderNumber') {
    orderBy = { orderNumber: sortDirection }
  } else if (sortColumn === 'status') {
    orderBy = { status: sortDirection }
  } else if (sortColumn === 'paymentStatus') {
    orderBy = { paymentStatus: sortDirection }
  } else if (sortColumn === 'totalAmount') {
    orderBy = { totalAmount: sortDirection }
  } else if (sortColumn === 'dueDate') {
    orderBy = { dueDate: sortDirection }
  } else if (sortColumn === 'paymentMethod') {
    orderBy = { paymentMethod: sortDirection }
  }

  const [orders, totalCount, recentCount, accountsReceivable] = await Promise.all([
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
        shippingAddress: {
          select: {
            line1: true,
            line2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true
          }
        },
        items: {
          select: {
            product: {
              select: {
                cost: true
              }
            },
            quantity: true,
            amount: true
          }
        }
      },
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.order.count({
      where
    }),
    prisma.order.count({
      where: {
        AND: [
          where,
          {
            orderDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        ]
      }
    }),
    prisma.order.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        AND: [
          {
            paymentStatus: {
              in: ['UNPAID', 'PARTIAL']
            }
          },
          {
            orderDate: {
              lt: new Date()
            }
          }
        ]
      }
    })
  ])

  const mappedOrders = orders.map((order) => {
    // Calculate total cost and margin
    const totalAmount = Number(order.totalAmount);
    let totalCost = 0;
    let totalNonShippingAmount = 0;
    
    order.items.forEach(item => {
      const quantity = Number(item.quantity);
      const amount = Number(item.amount || 0);
      
      // We don't have description or product name in this query, so we'll have to
      // implement a more complete solution in the detailed order view
      if (item.product?.cost) {
        totalCost += quantity * Number(item.product.cost);
        // Assume all items are non-shipping for this simplified view
        totalNonShippingAmount += amount;
      }
    });
    
    // Calculate margin percentage
    const margin = totalNonShippingAmount > 0 ? 
      ((totalNonShippingAmount - totalCost) / totalNonShippingAmount * 100) : 0;
    
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customerName: order.customer.customerName,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: totalAmount,
      margin: Number(margin.toFixed(1)),
      dueDate: order.dueDate,
      paymentMethod: order.paymentMethod,
      quickbooksId: order.quickbooksId,
      shippingAddress: order.shippingAddress,
    };
  });

  return {
    orders: mappedOrders,
    totalCount,
    recentCount,
    accountsReceivable: Number(accountsReceivable._sum.totalAmount || 0)
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
              id: true,
              name: true,
              domain: true
            }
          },
          emails: {
            select: {
              email: true,
              type: true,
              isPrimary: true
            }
          },
          phones: {
            select: {
              phone: true,
              type: true,
              isPrimary: true
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
                productCode: true,
                cost: true
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

  // Calculate total cost and margin for the whole order
  let totalCost = 0;
  let totalNonShippingAmount = 0;
  const items = order.items.map(item => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const amount = Number(item.amount);
    
    // Check if this is a shipping item (description contains "shipping" or "freight")
    const isShippingItem = item.description?.toLowerCase().includes('shipping') || 
                           item.description?.toLowerCase().includes('freight') ||
                           item.product.name?.toLowerCase().includes('shipping') ||
                           item.product.name?.toLowerCase().includes('freight');
    
    // Calculate cost and margin
    const cost = item.product?.cost ? Number(item.product.cost) * quantity : 0;
    const itemMargin = isShippingItem ? 0 : (amount > 0 ? ((amount - cost) / amount * 100) : 0);
    
    // Add to totals (exclude shipping from margin calculation)
    totalCost += cost;
    if (!isShippingItem) {
      totalNonShippingAmount += amount;
    }
    
    return {
      ...item,
      quantity,
      unitPrice,
      amount,
      cost,
      isShippingItem,
      margin: Number(itemMargin.toFixed(1))
    };
  });
  
  const totalAmount = Number(order.totalAmount);
  // Calculate margin based on non-shipping amounts only
  const margin = totalNonShippingAmount > 0 ? 
    ((totalNonShippingAmount - totalCost) / totalNonShippingAmount * 100) : 0;
  
  return {
    ...order,
    totalAmount,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    totalCost,
    margin: Number(margin.toFixed(1)),
    items
  }
}
