import { getAdhesiveOnlyCustomers, getAdhesiveMetrics } from "@/lib/reports"
import { AdhesiveOnlyOrdersTable } from "@/components/reports/adhesive-only-orders-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function AdhesiveOnlyOrdersPage() {
  const [customers, metrics] = await Promise.all([
    getAdhesiveOnlyCustomers(),
    getAdhesiveMetrics()
  ])

  return (
    <div className="p-8">
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Adhesive Only Orders</h1>
        <p className="text-muted-foreground">
          Customers who have only ordered EPX2, EPX3, or EPX5 products
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <MetricCard
          title="12mo Adhesive Orders"
          value={metrics.orderCount.current}
          change={metrics.orderCount.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="12mo Adhesive Revenue"
          value={formatCurrency(metrics.totalSpent.current)}
          change={metrics.totalSpent.change}
          icon={DollarSign}
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(metrics.averageOrder.current)}
          change={metrics.averageOrder.change}
          icon={TrendingUp}
        />
      </div>

      <div className="rounded-md border">
        <AdhesiveOnlyOrdersTable customers={customers} />
      </div>
  </div>
  </div>
  )
}
