import { getAdhesiveOnlyCustomers, getAdhesiveMetrics } from "@/lib/reports"
import { AdhesiveOnlyOrdersTable } from "@/components/reports/adhesive-only-orders-table"
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
  const [customers, metrics] = await Promise.all([
    getAdhesiveOnlyCustomers(filterConsumer),
    getAdhesiveMetrics(filterConsumer)
  ])

  return (
    <div className="p-8">
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Adhesive Only Orders</h1>
            <p className="text-muted-foreground">
              Customers who have only ordered EPX2, EPX3, or EPX5 products
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
