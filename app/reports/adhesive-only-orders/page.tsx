import { getAdhesiveOnlyOrders, getAdhesiveMetrics } from "@/lib/reports"
import { fetchAdhesiveOrders } from "@/app/actions/data"
import { ServerOrdersTable } from "@/components/orders/server-orders-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export default async function AdhesiveOnlyOrdersPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const filterConsumer = searchParams.filterConsumer !== "false"
  const [initialOrders, metrics] = await Promise.all([
    getAdhesiveOnlyOrders({ filterConsumer }),
    getAdhesiveMetrics({ filterConsumer })
  ])

  // Calculate average order value
  const currentAvgOrder = metrics.currentPeriod.totalRevenue / metrics.currentPeriod.orderCount || 0
  const previousAvgOrder = metrics.previousPeriod.totalRevenue / metrics.previousPeriod.orderCount || 0
  const avgOrderChange = previousAvgOrder ? 
    ((currentAvgOrder - previousAvgOrder) / previousAvgOrder * 100).toFixed(1) :
    "0.0"

  return (
    <div className="p-8">
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Adhesive Only Orders</h1>
            <p className="text-muted-foreground">
              Orders from customers who have only purchased EPX2, EPX3, or EPX5 products (never SP products)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={filterConsumer ? "bg-blue-50" : ""}
            asChild
          >
            <a href={`?filterConsumer=${!filterConsumer}`}>
              {filterConsumer ? "Hiding" : "Show"} Consumer Domains
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <MetricCard
          title="12mo Adhesive Orders"
          value={metrics.currentPeriod.orderCount}
          change={metrics.changes.orderCount}
          icon={ShoppingCart}
        />
        <MetricCard
          title="12mo Adhesive Revenue"
          value={formatCurrency(metrics.currentPeriod.totalRevenue)}
          change={metrics.changes.totalRevenue}
          icon={DollarSign}
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(currentAvgOrder)}
          change={avgOrderChange}
          icon={TrendingUp}
        />
      </div>

      <ServerOrdersTable 
        initialOrders={initialOrders}
        fetchOrders={fetchAdhesiveOrders}
        preserveParams={["filterConsumer"]}
        title="Adhesive Orders"
      />
    </div>
    </div>
  )
}
