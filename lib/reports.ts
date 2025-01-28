import { prisma } from "@/lib/prisma"

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

export async function getAdhesiveMetrics() {
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

export async function getAdhesiveOnlyCustomers() {
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
          domain: true
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

  return customers.map(customer => ({
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
