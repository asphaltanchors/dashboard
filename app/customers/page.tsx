import { AppSidebar } from "@/components/app-sidebar"
import { CustomersTable } from "@/components/customers/customers-table"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCustomers } from "@/lib/customers"

export default async function CustomersPage() {
  const customers = await getCustomers()
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
          <CustomersTable customers={customers} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
