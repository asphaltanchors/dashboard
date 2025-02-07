import { getCanadianSalesMetrics, getCanadianTopCustomers, getCanadianUnitsSold } from "@/lib/reports"
import { CanadianSalesTable } from "@/components/reports/canadian-sales-table"
import { CanadianUnitsTable } from "@/components/reports/canadian-units-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { DollarSign, ShoppingCart, Package } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function CanadianSalesPage() {
  const [metrics, customers, products] = await Promise.all([
    getCanadianSalesMetrics(),
    getCanadianTopCustomers(),
    getCanadianUnitsSold()
  ])

  return (
    <div className="p-8">
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Canadian Sales Report</h1>
          <p className="text-muted-foreground">
            Sales metrics and customer analysis for Canadian market
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <MetricCard
            title="Canadian Orders"
            value={metrics.currentPeriod.orderCount}
            change={metrics.changes.orderCount}
            icon={ShoppingCart}
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.currentPeriod.totalRevenue)}
            change={metrics.changes.totalRevenue}
            icon={DollarSign}
          />
          <MetricCard
            title="Net Revenue (ex Shipping)"
            value={formatCurrency(metrics.currentPeriod.netRevenue)}
            change={metrics.changes.netRevenue}
            icon={DollarSign}
          />
        </div>

        <div className="space-y-12">
          <div>
            <h2 className="text-xl font-semibold mb-4">Top Canadian Customers</h2>
            <div className="rounded-md border">
              <CanadianSalesTable customers={customers} />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Product Units Sold</h2>
            <div className="rounded-md border">
              <CanadianUnitsTable products={products} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
