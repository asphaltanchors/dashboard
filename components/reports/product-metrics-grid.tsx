import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProductLineMetrics } from "@/lib/reports"
import { formatCurrency } from "@/lib/utils"

interface ProductLineMetric {
  product_line: string
  order_count: string
  total_units: string
  total_revenue: string
}

interface ProductMetricsGridProps {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

export async function ProductMetricsGrid({
  dateRange,
  minAmount,
  maxAmount,
  filterConsumer
}: ProductMetricsGridProps) {
  const metrics = await getProductLineMetrics({
    dateRange,
    minAmount,
    maxAmount,
    filterConsumer
  }) as ProductLineMetric[]
  
  // Calculate totals
  const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.total_revenue), 0)
  const totalUnits = metrics.reduce((sum, m) => sum + Number(m.total_units), 0)
  const totalOrders = metrics.reduce((sum, m) => sum + Number(m.order_count), 0)
  const avgOrderValue = totalRevenue / totalOrders

  // Find top performing product line
  const topLine = metrics.reduce((max, m) => 
    Number(m.total_revenue) > Number(max.total_revenue) ? m : max
  , metrics[0])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            Across all product lines
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUnits.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            All products combined
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
          <p className="text-xs text-muted-foreground">
            Per order average
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Product Line</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{topLine.product_line}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(Number(topLine.total_revenue))} in revenue
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
