"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SalesChannelMetric } from "@/types/reports"
import { ArrowDown, ArrowUp } from "lucide-react"

interface Props {
  metrics: SalesChannelMetric[]
}

function MiniSparkline({ values }: { values: number[] }) {
  const height = 24
  const width = 64
  const padding = 4
  const graphHeight = height - 2 * padding
  
  // Scale points to fit in the SVG
  const max = Math.max(...values)
  const min = Math.min(...values) * 0.9
  const scale = (val: number) => 
    graphHeight - ((val - min) / (max - min)) * graphHeight + padding

  // Calculate x positions for points
  const xStep = width / (values.length - 1)
  const points = values.map((val, i) => [i * xStep, scale(val)])
  
  // Determine trend color based on first and last values
  const trend = values[0] >= values[values.length - 1] ? "down" : "up"
  const color = trend === "up" ? "#22c55e" : "#ef4444"
  
  // Create path between points
  const pathD = points
    .map((point, i) => 
      i === 0 ? `M ${point[0]} ${point[1]}` : `L ${point[0]} ${point[1]}`
    )
    .join(" ")
  
  return (
    <svg width={width} height={height} className="inline-block">
      {/* Trend line */}
      <path 
        d={pathD}
        stroke={color} 
        strokeWidth="2" 
        fill="none" 
      />
      
      {/* Data points */}
      {points.map(([x, y], i) => (
        <circle 
          key={i}
          cx={x} 
          cy={y} 
          r="2" 
          fill={color} 
        />
      ))}
    </svg>
  )
}

function MiniBarChart({ percentage }: { percentage: number }) {
  return (
    <div className="w-16 h-3 bg-gray-100 rounded-sm overflow-hidden">
      <div 
        className="h-full transition-all"
        style={{ 
          width: `${Math.min(100, percentage)}%`,
          backgroundColor: percentage > 30 ? '#3b82f6' : '#93c5fd'
        }}
      />
    </div>
  )
}

function TrendIndicator({ change }: { change: number }) {
  const trend = change >= 0 ? "up" : "down"
  const Icon = trend === "up" ? ArrowUp : ArrowDown
  const color = trend === "up" ? "text-green-500" : "text-red-500"
  
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{Math.abs(change)}%</span>
    </div>
  )
}

export default function SalesChannelTable({ metrics }: Props) {
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

  // Sort by revenue
  const sortedMetrics = [...filteredMetrics].sort((a, b) => 
    Number(b.periods[0].total_revenue) - Number(a.periods[0].total_revenue)
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value)
  }

  const getPercentageChange = (current: string, previous: string) => {
    const curr = Number(current)
    const prev = Number(previous)
    if (prev === 0) return 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b-2">
            <TableHead className="w-[180px] font-bold">Channel</TableHead>
            <TableHead className="text-right font-bold">Revenue</TableHead>
            <TableHead className="text-right w-[80px] font-bold">Share</TableHead>
            <TableHead className="text-right w-[140px] font-bold border-r">Trend</TableHead>
            <TableHead className="text-right font-bold">Units</TableHead>
            <TableHead className="text-right w-[80px] font-bold">Share</TableHead>
            <TableHead className="text-right font-bold">Orders</TableHead>
            <TableHead className="text-right font-bold">Avg Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Channel rows */}
          {sortedMetrics.map((metric) => {
            const revenues = metric.periods.map(p => Number(p.total_revenue))
            const currentRevenue = revenues[0]
            const currentUnits = Number(metric.periods[0].total_units)
            const currentOrders = Number(metric.periods[0].order_count)
            const avgOrderValue = currentRevenue / currentOrders

            const revenuePercentage = (currentRevenue / totals.revenue) * 100
            const unitsPercentage = (currentUnits / totals.units) * 100
            const revenueChange = getPercentageChange(
              metric.periods[0].total_revenue,
              metric.periods[1].total_revenue
            )

            return (
              <TableRow 
                key={metric.sales_channel} 
                className={`hover:bg-gray-50 ${
                  revenuePercentage > 25 ? 'bg-blue-50/50' : ''
                }`}
              >
                <TableCell className="font-semibold">
                  {metric.sales_channel.startsWith('Amazon Combined:') 
                    ? metric.sales_channel.split(':')[1].trim()
                    : metric.sales_channel}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(currentRevenue)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm">{revenuePercentage.toFixed(1)}%</span>
                    <MiniBarChart percentage={revenuePercentage} />
                  </div>
                </TableCell>
                <TableCell className="text-right border-r">
                  <div className="flex items-center justify-end gap-2">
                    <MiniSparkline values={revenues.reverse()} />
                    <TrendIndicator change={revenueChange} />
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatNumber(currentUnits)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm">{unitsPercentage.toFixed(1)}%</span>
                    <MiniBarChart percentage={unitsPercentage} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm">{(currentOrders / totals.orders * 100).toFixed(1)}%</span>
                    <MiniBarChart percentage={(currentOrders / totals.orders * 100)} />
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(avgOrderValue)}</TableCell>
              </TableRow>
            )
          })}
          
          {/* Totals row */}
          <TableRow className="border-t-2 bg-gray-50/50 font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">
              {formatCurrency(totals.revenue)}
            </TableCell>
            <TableCell className="text-right">
              100%
            </TableCell>
            <TableCell className="text-right border-r">
              {/* Intentionally empty for trend column */}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(totals.units)}
            </TableCell>
            <TableCell className="text-right">
              100%
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span>100%</span>
                <MiniBarChart percentage={100} />
              </div>
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(totals.revenue / totals.orders)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  )
}
