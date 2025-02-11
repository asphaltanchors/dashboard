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
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {metrics.map((metric) => {
            const revenuePercentage = (Number(metric.total_revenue) / totalRevenue) * 100
            const unitsPercentage = (Number(metric.total_units) / totalUnits) * 100
            const ordersPercentage = (Number(metric.order_count) / totalOrders) * 100
            
            return (
              <div key={metric.sales_channel} className="rounded-lg border p-4">
                <h3 className="text-lg font-semibold mb-4">
                  {metric.sales_channel.startsWith('Amazon Combined:') 
                    ? metric.sales_channel.split(':')[1].trim()
                    : metric.sales_channel}
                </h3>
                <div className="space-y-6">
                  {/* Revenue */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-muted-foreground">Revenue</div>
                      <div className="text-xs text-muted-foreground">
                        {revenuePercentage.toFixed(1)}% of total
                      </div>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(Number(metric.total_revenue))}
                    </div>
                  </div>

                  {/* Units */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-muted-foreground">Units Sold</div>
                      <div className="text-xs text-muted-foreground">
                        {unitsPercentage.toFixed(1)}% of total
                      </div>
                    </div>
                    <div className="text-2xl font-bold">
                      {Number(metric.total_units).toLocaleString()}
                    </div>
                  </div>

                  {/* Orders & Average Price */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-muted-foreground">Orders</div>
                        <div className="text-xs text-muted-foreground">
                          {ordersPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-xl font-semibold">
                        {Number(metric.order_count).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Avg Order</div>
                      <div className="text-xl font-semibold">
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
