"use client"

import { Bar, Scatter, ComposedChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer, TooltipProps } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface ProductLinePerformanceProps {
  data: Array<{
    product: string
    current: number
    previous: number
  }>
}

export function ProductLinePerformanceChart({ data }: ProductLinePerformanceProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Product Line Performance</CardTitle>
        <CardDescription>Revenue Comparison - Trailing 12 Months vs Previous Period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ChartContainer
            config={{
              current: {
                label: "Last 12 Months",
                color: "hsl(222.2, 47.4%, 11.2%)",
              },
              previous: {
                label: "Previous 12 Months",
                color: "hsl(15, 100%, 55%)",
              },
            }}
            className="h-full w-full"
          >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={data} 
              margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="product" 
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={(value: string | number) => formatCurrency(Number(value))} />
              <ChartTooltip
                content={({ active, payload }: TooltipProps<number, string>) => {
                  if (active && payload && payload.length) {
                    const current = payload.find((p) => p.dataKey === "current")?.value
                    const previous = payload.find((p) => p.dataKey === "previous")?.value
                    const currentValue = Number(current) || 0
                    const previousValue = Number(previous) || 0
                    const percentChange = previousValue > 0 
                      ? ((currentValue - previousValue) / previousValue * 100).toFixed(1)
                      : "0.0"
                    
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Last 12 Months</span>
                            <span className="font-bold text-blue-600">{formatCurrency(currentValue)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Previous 12 Months</span>
                            <span className="font-bold text-orange-500">{formatCurrency(previousValue)}</span>
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Change</span>
                            <span className={`text-sm font-medium ${Number(percentChange) > 0 ? 'text-green-600' : Number(percentChange) < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {Number(percentChange) > 0 ? '+' : ''}{percentChange}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Bar
                dataKey="current"
                fill="#2563EB"
                name="Last 12 Months"
                barSize={Math.max(20, Math.min(40, 600 / data.length))}
              />
              <Scatter
                dataKey="previous"
                fill="#F97316"
                name="Previous 12 Months"
                r={6}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
