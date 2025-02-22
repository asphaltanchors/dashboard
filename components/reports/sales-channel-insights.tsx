"use client"

import { ChannelCard } from "./channel-card"
import { SalesChannelMetric } from "@/types/reports"

interface Props {
  metrics: SalesChannelMetric[]
}

export default function SalesChannelInsights({ metrics }: Props) {
  // Filter out Contractor class and zero revenue channels
  const filteredMetrics = metrics.filter(m => 
    m.sales_channel !== 'Contractor' && 
    Number(m.periods[0].total_revenue) > 0
  )

  // Calculate totals for current period
  const totals = filteredMetrics.reduce(
    (acc, m) => {
      acc.revenue += Number(m.periods[0].total_revenue)
      acc.units += Number(m.periods[0].total_units)
      acc.orders += Number(m.periods[0].order_count)
      return acc
    },
    { revenue: 0, units: 0, orders: 0 }
  )

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {filteredMetrics.map((metric) => {
        const currentRevenue = Number(metric.periods[0].total_revenue)
        const previousRevenue = Number(metric.periods[1].total_revenue)
        const currentUnits = Number(metric.periods[0].total_units)
        const previousUnits = Number(metric.periods[1].total_units)
        const currentOrders = Number(metric.periods[0].order_count)

        // Calculate trends
        const getPercentageChange = (current: number, previous: number) => {
          if (previous === 0) return 0
          return Math.round(((current - previous) / previous) * 100)
        }

        const getTrend = (current: number, previous: number): "up" | "down" | "neutral" => {
          if (current === previous) return "neutral"
          return current > previous ? "up" : "down"
        }

        const revenueChange = getPercentageChange(currentRevenue, previousRevenue)
        const unitsChange = getPercentageChange(currentUnits, previousUnits)

        return (
          <ChannelCard
            key={metric.sales_channel}
            name={metric.sales_channel.startsWith('Amazon Combined:') 
              ? metric.sales_channel.split(':')[1].trim()
              : metric.sales_channel}
            revenue={{
              value: currentRevenue,
              percentage: (currentRevenue / totals.revenue) * 100,
              trend: getTrend(currentRevenue, previousRevenue),
              change: Math.abs(revenueChange)
            }}
            units={{
              value: currentUnits,
              percentage: (currentUnits / totals.units) * 100,
              trend: getTrend(currentUnits, previousUnits),
              change: Math.abs(unitsChange)
            }}
            orders={{
              value: currentOrders,
              percentage: (currentOrders / totals.orders) * 100
            }}
            averageOrder={Number(metric.periods[0].avg_unit_price)}
          />
        )
      })}
    </div>
  )
}
