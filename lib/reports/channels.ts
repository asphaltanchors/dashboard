import { prisma } from "@/lib/prisma"
import { SalesChannelMetric } from "@/types/reports"
import { FilterParams, buildFilterClauses } from "./common"

// Sales channel insights data
export async function getSalesChannelMetrics(filters?: FilterParams) {
  const today = new Date()
  const days = filters?.dateRange ? parseInt(filters.dateRange.replace("d", "")) : 365
  
  // Create 4 periods
  const periodStarts = Array.from({ length: 4 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() - days * (i + 1))
    return date
  })
  
  const periodEnds = [today, ...periodStarts.slice(0, -1)]
  const { additionalFilters } = buildFilterClauses(filters)

  const results = await prisma.$queryRawUnsafe<Array<{
    sales_channel: string
    order_count: string
    total_units: string
    total_revenue: string
    avg_unit_price: string
    period_index: number
    period_start: string
    period_end: string
  }>>(`
    WITH periods AS (
      ${periodStarts.map((start, i) => `
        SELECT 
          ${i} as period_index,
          CAST('${start.toISOString()}' AS timestamp) as period_start,
          CAST('${periodEnds[i].toISOString()}' AS timestamp) as period_end
      `).join(' UNION ALL ')}
    )
    SELECT 
      COALESCE(o.class, 'Unclassified') as sales_channel,
      COALESCE(COUNT(DISTINCT "orderId"), 0) as order_count,
      COALESCE(SUM(COALESCE(CAST(quantity AS numeric), 0)), 0) as total_units,
      COALESCE(SUM(amount), 0) as total_revenue,
      COALESCE(SUM(amount) / NULLIF(COUNT(DISTINCT "orderId"), 0), 0) as avg_unit_price,
      p.period_index,
      CAST(p.period_start AS text) as period_start,
      CAST(p.period_end AS text) as period_end
    FROM periods p
    LEFT JOIN "Order" o ON o."orderDate" >= p.period_start AND o."orderDate" < p.period_end
    LEFT JOIN "OrderItem" oi ON oi."orderId" = o."id"
    WHERE (oi."productCode" LIKE '01-63%'
           OR oi."productCode" IN ('82-5002.K', '82-5002.010')
           OR oi."productCode" LIKE '82-6002%'
           OR oi."productCode" LIKE '01-70%')
    ${additionalFilters}
    GROUP BY 
      COALESCE(o.class, 'Unclassified'),
      p.period_index,
      p.period_start,
      p.period_end
    ORDER BY
      sales_channel,
      period_index
  `)

  // Transform results into the new format
  const metricsByChannel = results.reduce((acc, metric) => {
    if (!acc[metric.sales_channel]) {
      acc[metric.sales_channel] = {
        sales_channel: metric.sales_channel,
        periods: Array(4).fill({
          order_count: "0",
          total_units: "0",
          total_revenue: "0",
          avg_unit_price: "0"
        })
      }
    }

    acc[metric.sales_channel].periods[metric.period_index] = {
      order_count: String(metric.order_count),
      total_units: String(metric.total_units),
      total_revenue: String(metric.total_revenue),
      avg_unit_price: String(metric.avg_unit_price),
      period_start: metric.period_start || new Date(periodStarts[metric.period_index]).toISOString(),
      period_end: metric.period_end || new Date(periodEnds[metric.period_index]).toISOString()
    }

    return acc
  }, {} as Record<string, SalesChannelMetric>)

  return Object.values(metricsByChannel)
}
