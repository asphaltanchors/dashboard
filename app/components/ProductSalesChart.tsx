"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"

type SalesData = {
  month: string;
  revenue: number;
  quantity: number;
}

interface ProductSalesChartProps {
  salesData: SalesData[];
  // productCode is not used in this chart
}

const chartConfig = {
  views: {
    label: "Sales Data",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  quantity: {
    label: "Quantity",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function ProductSalesChart({ salesData }: ProductSalesChartProps) {
  const [activeChart, setActiveChart] = React.useState<keyof typeof chartConfig>("revenue")

  // Process data to ensure numbers
  const processedData = React.useMemo(() => {
    return salesData.map(item => ({
      month: item.month,
      revenue: Number(item.revenue),
      quantity: Number(item.quantity)
    }))
  }, [salesData])

  const total = React.useMemo(() => ({
    revenue: processedData.reduce((acc, curr) => acc + (curr.revenue || 0), 0),
    quantity: processedData.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
  }), [processedData])

  // Format month to be more readable
  const formatMonth = (month: string) => {
    try {
      const [year, monthNum] = month.split('-')
      return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(monthNum) - 1]} ${year}`
    } catch { // Removed unused 'e' variable
      return month
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>All-Time Sales Trend</CardTitle>
        </div>
        <div className="flex">
          {(["revenue", "quantity"] as const).map((key) => { // Use 'as const' for stricter type inference
            const chart = key // Type is now correctly "revenue" | "quantity"
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg font-bold leading-none sm:text-xl">
                  {chart === "revenue" 
                    ? `$${Math.round(total[chart]).toLocaleString()}`
                    : Math.round(total[chart]).toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {processedData.length === 0 ? (
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            No sales data available
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedData}
                margin={{
                  left: 0,
                  right: 20,
                  top: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={formatMonth}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={80}
                  tickFormatter={(value) => 
                    activeChart === "revenue" 
                      ? `$${Math.round(value).toLocaleString()}`
                      : Math.round(value).toLocaleString()
                  }
                />
                <Tooltip
                  formatter={(value: number) => 
                    activeChart === "revenue"
                      ? [`$${Number(value).toLocaleString(undefined, {maximumFractionDigits: 2})}`, "Revenue"]
                      : [Number(value).toLocaleString(), "Quantity"]
                  }
                  labelFormatter={formatMonth}
                />
                <Bar 
                  dataKey={activeChart} 
                  fill={activeChart === "revenue" ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
