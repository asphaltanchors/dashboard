import { AppSidebar } from "@/components/app-sidebar"
import { OrdersTable } from "@/components/orders/orders-table"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getOrders } from "@/lib/orders"

export default async function OrdersPage() {
  const orders = await getOrders()
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
          <h1 className="text-3xl font-bold mb-8">Orders</h1>
          <OrdersTable orders={orders} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
