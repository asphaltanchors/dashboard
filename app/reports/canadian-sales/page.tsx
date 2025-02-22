import { getCanadianSalesMetrics, getCanadianTopCustomers, getCanadianUnitsSold, getCanadianOrders } from "@/lib/reports"
import { CanadianSalesTable } from "@/components/reports/canadian-sales-table"
import { CanadianUnitsTable } from "@/components/reports/canadian-units-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { DollarSign, ShoppingCart } from "lucide-react"
import { ServerOrdersTable } from "@/components/orders/server-orders-table"
import { fetchCanadianOrders } from "@/app/actions/data"
import { formatCurrency } from "@/lib/utils"
import { ReportHeader } from "@/components/reports/report-header"

interface FilterParams {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
}

interface PageProps {
  searchParams: Promise<{
    date_range?: string
    min_amount?: string
    max_amount?: string
    filterConsumer?: string
  }>
}

export default async function CanadianSalesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const date_range = searchParams.date_range || "365d"
  const min_amount = searchParams.min_amount
  const max_amount = searchParams.max_amount
  const filterConsumer = searchParams.filterConsumer !== undefined

  // Parse filter parameters
  const filters = {
    dateRange: date_range,
    minAmount: min_amount ? parseFloat(min_amount) : undefined,
    maxAmount: max_amount ? parseFloat(max_amount) : undefined,
    filterConsumer
  }

  const [metrics, customers, products, orders] = await Promise.all([
    getCanadianSalesMetrics({
      dateRange: filters.dateRange,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount
    } as FilterParams),
    getCanadianTopCustomers({
      dateRange: filters.dateRange,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount
    } as FilterParams),
    getCanadianUnitsSold({
      dateRange: filters.dateRange,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount
    } as FilterParams),
    getCanadianOrders({
      dateRange: filters.dateRange,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount
    } as FilterParams)
  ])

  return (
    <div className="p-8">
      <ReportHeader
        title="Canadian Sales Report"
        resetPath="/reports/canadian-sales?date_range=365d"
        dateRange={date_range}
        minAmount={min_amount ? parseFloat(min_amount) : undefined}
        maxAmount={max_amount ? parseFloat(max_amount) : undefined}
        filterConsumer={filterConsumer}
      />
      <p className="text-muted-foreground mt-2">
        Sales metrics and customer analysis for Canadian market
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
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

      <div className="space-y-12 mt-4">
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

        <div>
          <h2 className="text-xl font-semibold mb-4">Canadian Orders</h2>
          <div className="rounded-md border">
            <ServerOrdersTable
              initialOrders={orders}
              fetchOrders={fetchCanadianOrders}
              preserveParams={['date_range', 'min_amount', 'max_amount', 'filterConsumer']}
              title="Canadian Orders"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
