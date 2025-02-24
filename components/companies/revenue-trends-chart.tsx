"use client"

import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
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

interface RevenueTrendsChartProps {
  data: Array<{
    year: number
    revenue: number
  }>
}

export function RevenueTrendsChart({ data }: RevenueTrendsChartProps) {
  // If no data or only one year, add empty years to make chart more meaningful
  const chartData = data.length <= 1 
    ? [...data, { year: data[0]?.year ? data[0].year + 1 : new Date().getFullYear(), revenue: 0 }]
    : data

  // Format data for the chart
  const formattedData = chartData.map(item => ({
    name: item.year.toString(),
    revenue: item.revenue
  }))

  // Calculate max value for Y axis with some padding
  const maxRevenue = Math.max(...chartData.map(d => d.revenue)) * 1.2

  return (
    <div className="w-full h-[300px]">
      <ChartContainer
        config={{
          revenue: {
            label: "Revenue",
            color: "#3b82f6"
          }
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
                            Year
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
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
