import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function CustomersPage() {
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
          <div className="rounded-xl bg-muted/50 p-4">
            <p>Customer list will go here</p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
