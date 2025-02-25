import { ServerOrdersTable } from "@/components/orders/server-orders-table"
import { fetchOrders } from "@/app/actions/data"
import { MetricCard } from "@/components/dashboard/metric-card"
import { getOrders } from "@/lib/orders"
import { FileText, Clock } from "lucide-react"
import { FilterMetricCard } from "@/components/orders/filter-metric-card"
import { ReportHeader } from "@/components/reports/report-header"

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    sort?: string
    dir?: string
    filter?: string
    date_range?: string
    min_amount?: string
    max_amount?: string
    filterConsumer?: string
  }>
}

export default async function OrdersPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1
  const search = (searchParams.search as string) || ""
  const sort = (searchParams.sort as string) || "orderDate"
  const dir = (searchParams.dir as "asc" | "desc") || "desc"
  const filter = searchParams.filter as string | undefined
  const date_range = searchParams.date_range || "365d"
  const min_amount = searchParams.min_amount
  const max_amount = searchParams.max_amount
  const filterConsumer = searchParams.filterConsumer !== undefined

  const data = await getOrders({
    page,
    pageSize: 10,
    searchTerm: search,
    sortColumn: sort,
    sortDirection: dir,
    paymentStatusFilter: filter === 'unpaid-only' ? 'unpaid-only' : null,
    dateRange: date_range,
    minAmount: min_amount ? parseFloat(min_amount) : undefined,
    maxAmount: max_amount ? parseFloat(max_amount) : undefined,
    filterConsumer
  })
  return (
    <div className="p-8">
      <ReportHeader
        title="Orders"
        resetPath="/orders?date_range=365d"
        dateRange={date_range}
        minAmount={min_amount ? parseFloat(min_amount) : undefined}
        maxAmount={max_amount ? parseFloat(max_amount) : undefined}
        filterConsumer={filterConsumer}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
        <MetricCard
          title="Total Orders"
          value={data.totalCount}
          change=""
          icon={FileText}
        />
        <MetricCard
          title="Recent Orders (30d)"
          value={data.recentCount}
          change={(data.recentCount / data.totalCount * 100).toFixed(1)}
          icon={Clock}
        />
        <FilterMetricCard value={data.accountsReceivable} />
      </div>
      <div className="mt-4">
        <ServerOrdersTable 
          initialOrders={data}
          fetchOrders={fetchOrders}
          preserveParams={['filter', 'date_range', 'min_amount', 'max_amount', 'filterConsumer']}
        />
      </div>
    </div>
  )
}
