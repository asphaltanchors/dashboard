"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "An interactive area chart"


const chartConfig = {
  revenue: {
    label: "Revenue",
  },
  desktop: {
    label: "Orders",
    color: "var(--primary)",
  },
  mobile: {
    label: "Revenue",
    color: "var(--primary)",
  },
} satisfies ChartConfig

// Define a type for the chart data items
interface ChartDataItem {
  date: string;
  orders?: number;
  revenue?: number;
}

// Type for the formatted data that will be passed to the chart

export function ChartAreaInteractive({ data }: { data: ChartDataItem[] }) {
  // Get the most recent month from the chart data
  const today = new Date()
  
  // Get data for the last 24 months
  const startDate = new Date(today)
  startDate.setMonth(startDate.getMonth() - 24)
  
  // Convert data to match the expected format for the chart
  const formattedData = React.useMemo(() => {
    // Convert the data to the proper object structure for the chart
    return data.map(item => ({
      date: item.date,
      desktop: item.orders || 0,  // Orders 
      mobile: item.revenue || 0   // Revenue
    }))
  }, [data])

  return (
    <div className="@container/chart w-full">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[300px] w-full"
      >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="#0ea5e9" /* Sky color for revenue */
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="#0ea5e9"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="#f59e0b" /* Amber color for orders */
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="#f59e0b"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={true}
                tickMargin={8}
                minTickGap={20}
                tickFormatter={(value) => {
                  // If data contains YYYY-MM format (from database)
                  if (value.includes('-') && value.length === 7) {
                    const [year, month] = value.split('-');
                    return `${new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'short' })} ${year}`;
                  }
                  
                  // Otherwise (for demo data)
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric"
                  })
                }}
              />
              {/* Y-axis for Revenue */}
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                stroke="#0ea5e9"
                axisLine={{ stroke: '#0ea5e9' }}
                tickLine={{ stroke: '#0ea5e9' }}
                label={{ value: 'Revenue', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <ChartTooltip
                cursor={false}
                defaultIndex={-1}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      // If data contains YYYY-MM format (from database)
                      if (value.includes('-') && value.length === 7) {
                        const [year, month] = value.split('-');
                        return `${new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                      }
                      
                      // Otherwise (for demo data)
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      });
                    }}
                    indicator="dot"
                    formatter={(value, name) => {
                      if (name === "Revenue") {
                        return [`$${Number(value).toLocaleString()}`, name];
                      }
                      return [Number(value).toLocaleString(), name];
                    }}
                  />
                }
              />
              {/* Only showing revenue data */}
              <Area
                dataKey="mobile"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="#0ea5e9"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
    </div>
  )
}
