import { AppSidebar } from "@/components/app-sidebar"
import { MetricCard } from "@/components/dashboard/metric-card"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, ShoppingCart } from "lucide-react"
import { getOrderMetrics, getRecentOrders } from "@/lib/dashboard"

export default async function Home() {
  const { currentTotalOrders, orderChange, currentTotalSales, salesChange } = await getOrderMetrics()
  const recentOrders = await getRecentOrders()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-8">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Total Orders (30d)"
              value={currentTotalOrders}
              change={orderChange}
              icon={ShoppingCart}
            />
            <MetricCard
              title="Total Sales (30d)"
              value={formatCurrency(currentTotalSales)}
              change={salesChange}
              icon={DollarSign}
            />
          </div>

          <div className="mt-4">
            <RecentOrders orders={recentOrders} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
