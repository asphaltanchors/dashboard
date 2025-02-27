import { prisma } from "@/lib/prisma"

export async function getCompanyOrderMetrics(months: number) {
  const today = new Date()
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setMonth(today.getMonth() - months)
  
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - months)

  // Get all orders grouped by company for both periods
  const orders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: previousPeriodStart
      },
      customer: {
        company: {
          isNot: null
        }
      }
    },
    include: {
      customer: {
        include: {
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

  // Group orders by company and period
  const companyOrders = new Map<string, {
    id: string
    name: string | null
    domain: string
    currentTotal: number
    previousTotal: number
  }>()

  orders.forEach(order => {
    const company = order.customer.company
    if (!company) return

    const existing = companyOrders.get(company.id) || {
      id: company.id,
      name: company.name,
      domain: company.domain,
      currentTotal: 0,
      previousTotal: 0
    }

    const amount = Number(order.totalAmount)
    if (order.orderDate >= currentPeriodStart) {
      existing.currentTotal += amount
    } else if (order.orderDate >= previousPeriodStart && order.orderDate < currentPeriodStart) {
      existing.previousTotal += amount
    }

    companyOrders.set(company.id, existing)
  })

  // Calculate percentage changes and filter out companies with no orders
  const companies = Array.from(companyOrders.values())
    .filter(company => company.currentTotal > 0 || company.previousTotal > 0)
    .map(company => ({
      ...company,
      percentageChange: company.previousTotal > 0 
        ? ((company.currentTotal - company.previousTotal) / company.previousTotal * 100)
        : company.currentTotal > 0 ? 100 : 0
    }))
    .sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange))

  // Calculate summary statistics
  const increasing = companies.filter(c => c.percentageChange > 0)
  const decreasing = companies.filter(c => c.percentageChange < 0)

  return {
    companies,
    summary: {
      increasingCount: increasing.length,
      decreasingCount: decreasing.length,
      averageIncrease: increasing.length > 0 
        ? increasing.reduce((sum, c) => sum + c.percentageChange, 0) / increasing.length
        : 0,
      averageDecrease: decreasing.length > 0
        ? Math.abs(decreasing.reduce((sum, c) => sum + c.percentageChange, 0) / decreasing.length)
        : 0
    }
  }
}
