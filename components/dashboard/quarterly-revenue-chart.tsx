"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface QuarterlyRevenueChartProps {
  data: Array<{
    quarter: number
    year: number
    revenue: number
    label: string
  }>
}

export function QuarterlyRevenueChart({ data }: QuarterlyRevenueChartProps) {
  // Format data for the chart
  const formattedData = data.map(item => ({
    name: item.label,
    revenue: item.revenue
  }))

  // Calculate max value for Y axis with some padding
  const maxRevenue = Math.max(...data.map(d => d.revenue)) * 1.2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarterly Revenue (All Time, Excluding Current Quarter)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={formattedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
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
                            Quarter
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
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
