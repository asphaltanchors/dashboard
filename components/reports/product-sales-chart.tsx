"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface QuarterlySalesData {
  month: string
  total_sales: number
}

interface ProductSalesChartProps {
  data: QuarterlySalesData[]
}

export function ProductSalesChart({ data }: ProductSalesChartProps) {
  const now = new Date()
  const currentQuarter = Math.floor((now.getMonth() / 3)) + 1
  const currentYear = now.getFullYear()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarterly Sales History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  const quarter = Math.floor((date.getMonth() / 3)) + 1
                  const year = date.getFullYear()
                  return `Q${quarter} ${year}`
                }}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const date = new Date(payload[0].payload.month)
                    const quarter = Math.floor((date.getMonth() / 3)) + 1
                    const year = date.getFullYear()
                    const startDate = new Date(year, (quarter - 1) * 3, 1)
                    const endDate = new Date(year, quarter * 3, 0)
                    const isCurrentQuarter = year === currentYear && quarter === currentQuarter
                    
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Quarter
                            </span>
                            <span className="font-bold text-muted-foreground">
                              Q{quarter} {year}
                              {isCurrentQuarter && " (Current)"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Sales
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {formatCurrency(payload[0].value as number)}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[0.70rem] text-muted-foreground">
                              {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {isCurrentQuarter && " (In Progress)"}
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
                dataKey="total_sales"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 