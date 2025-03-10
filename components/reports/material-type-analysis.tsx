import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMaterialTypeMetrics } from "@/lib/reports"
import { formatCurrency } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface MaterialTypeMetric {
  material_type: string
  order_count: string
  total_units: string
  total_revenue: string
}

interface MaterialTypeAnalysisProps {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

export async function MaterialTypeAnalysis({
  dateRange,
  minAmount,
  maxAmount,
  filterConsumer
}: MaterialTypeAnalysisProps) {
  const metrics = await getMaterialTypeMetrics({
    dateRange,
    minAmount,
    maxAmount,
    filterConsumer
  }) as MaterialTypeMetric[]
  
  // Calculate total revenue for percentage calculations
  const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.total_revenue), 0)
  
  // Sort by revenue
  const sortedMetrics = [...metrics].sort((a, b) => 
    Number(b.total_revenue) - Number(a.total_revenue)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Type Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <div className="space-y-4">
            {sortedMetrics.map((metric) => {
              const percentage = (Number(metric.total_revenue) / totalRevenue) * 100
              return (
                <div key={metric.material_type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{metric.material_type}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(Number(metric.total_revenue))}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
