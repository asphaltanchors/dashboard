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
  description?: string
  dateRange?: string
}

export function ProductLinePerformanceChart({ 
  data,
  description = "Revenue Comparison - Trailing 12 Months vs Previous Period",
  dateRange = "365d"
}: ProductLinePerformanceProps) {
  const days = parseInt(dateRange.replace("d", ""))
  const period = days === 365 ? "12 Months" : `${days} Days`
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Product Line Performance</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ChartContainer
            config={{
              current: {
                label: `Last ${period}`,
                color: "hsl(var(--chart-oem))",
              },
              previous: {
                label: `Previous ${period}`,
                color: "hsl(var(--chart-distributor))",
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
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Last {period}</span>
                            <span className="font-bold text-primary">{formatCurrency(currentValue)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Previous {period}</span>
                            <span className="font-bold text-accent">{formatCurrency(previousValue)}</span>
                          </div>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">Change</span>
                            <span className={`text-sm font-medium ${Number(percentChange) > 0 ? 'text-success' : Number(percentChange) < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
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
                fill="hsl(var(--chart-oem))"
                name={`Last ${period}`}
                barSize={Math.max(20, Math.min(40, 600 / data.length))}
              />
              <Scatter
                dataKey="previous"
                fill="hsl(var(--chart-distributor))"
                name={`Previous ${period}`}
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
