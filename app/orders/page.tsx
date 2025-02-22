import { ServerOrdersTable } from "@/components/orders/server-orders-table"
import { fetchOrders } from "@/app/actions/data"
import { MetricCard } from "@/components/dashboard/metric-card"
import { getOrders } from "@/lib/orders"
import { FileText, Clock } from "lucide-react"
import { FilterMetricCard } from "@/components/orders/filter-metric-card"

export default async function OrdersPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1
  const search = (searchParams.search as string) || ""
  const sort = (searchParams.sort as string) || "orderDate"
  const dir = (searchParams.dir as "asc" | "desc") || "desc"
  const filter = searchParams.filter as string | undefined

  const data = await getOrders({
    page,
    pageSize: 10,
    searchTerm: search,
    sortColumn: sort,
    sortDirection: dir,
    paymentStatusFilter: filter === 'unpaid-only' ? 'unpaid-only' : null
  })
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Orders</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          preserveParams={['filter']}
        />
      </div>
    </div>
  )
}
