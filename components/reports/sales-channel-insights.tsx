import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSalesChannelMetrics } from "@/lib/reports"
import { formatCurrency } from "@/lib/utils"

interface SalesChannelMetric {
  sales_channel: string
  order_count: string
  total_units: string
  total_revenue: string
  avg_unit_price: string
}

export async function SalesChannelInsights() {
  const metrics = await getSalesChannelMetrics() as SalesChannelMetric[]
  
  // Calculate totals for percentage calculations
  const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.total_revenue), 0)
  const totalUnits = metrics.reduce((sum, m) => sum + Number(m.total_units), 0)
  const totalOrders = metrics.reduce((sum, m) => sum + Number(m.order_count), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Channel Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {metrics.map((metric) => {
            const revenuePercentage = (Number(metric.total_revenue) / totalRevenue) * 100
            const unitsPercentage = (Number(metric.total_units) / totalUnits) * 100
            const ordersPercentage = (Number(metric.order_count) / totalOrders) * 100
            
            return (
              <div key={metric.sales_channel} className="space-y-4">
                <h3 className="text-lg font-semibold">{metric.sales_channel}</h3>
                <div className="grid gap-4">
                  {/* Revenue */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Revenue</div>
                      <div className="text-xs text-muted-foreground">
                        {revenuePercentage.toFixed(1)}% of total
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(Number(metric.total_revenue))}
                      </div>
                    </div>
                  </div>

                  {/* Units */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Units Sold</div>
                      <div className="text-xs text-muted-foreground">
                        {unitsPercentage.toFixed(1)}% of total
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {Number(metric.total_units).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Orders & Average Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Orders</div>
                      <div className="text-sm">
                        {Number(metric.order_count).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ordersPercentage.toFixed(1)}% of total
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Avg Price</div>
                      <div className="text-sm">
                        {formatCurrency(Number(metric.avg_unit_price))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
