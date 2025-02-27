"use client"

import { 
  ChartContainer
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface MonthlyRevenueChartProps {
  data: Array<{
    month: number
    year: number
    revenue: number
  }>
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  // Format data for the chart
  const formattedData = data.map(item => {
    const date = new Date(item.year, item.month)
    return {
      name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: item.revenue
    }
  })

  // Calculate max value for Y axis with some padding
  const maxRevenue = Math.max(...data.map(d => d.revenue)) * 1.2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue (Last 18 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={formattedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
                barCategoryGap="5%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  domain={[0, maxRevenue]}
                  tickMargin={10}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Month
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.name}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Revenue
                              </span>
                              <span className="font-bold">
                                {formatCurrency(payload[0].value as number)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
