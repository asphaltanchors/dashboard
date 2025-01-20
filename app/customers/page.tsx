import { AppSidebar } from "@/components/app-sidebar"
import { CustomersTable } from "@/components/customers/customers-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCustomers } from "@/lib/customers"
import { Users, UserPlus } from "lucide-react"

export default async function CustomersPage() {
  const { customers, totalCount, recentCount } = await getCustomers()
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
          <h1 className="text-3xl font-bold mb-8">Customers</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Customers"
              value={totalCount}
              change=""
              icon={Users}
            />
            <MetricCard
              title="New Customers (30d)"
              value={recentCount}
              change={(recentCount / totalCount * 100).toFixed(1)}
              icon={UserPlus}
            />
          </div>
          <CustomersTable customers={customers} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
