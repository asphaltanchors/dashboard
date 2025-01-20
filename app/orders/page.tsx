import { OrdersTable } from "@/components/orders/orders-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { getOrders } from "@/lib/orders"
import { FileText, Clock } from "lucide-react"

export default async function OrdersPage() {
  const { orders, totalCount, recentCount } = await getOrders()
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Orders</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Orders"
              value={totalCount}
              change=""
              icon={FileText}
            />
            <MetricCard
              title="Recent Orders (30d)"
              value={recentCount}
              change={(recentCount / totalCount * 100).toFixed(1)}
              icon={Clock}
            />
      </div>
      <div className="mt-4">
        <OrdersTable orders={orders} />
      </div>
    </div>
  )
}
