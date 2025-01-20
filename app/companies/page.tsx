import { AppSidebar } from "@/components/app-sidebar"
import { CompaniesTable } from "@/components/companies/companies-table"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCompanies } from "@/lib/companies"

export default async function CompaniesPage() {
  const companies = await getCompanies()
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
          <h1 className="text-3xl font-bold mb-8">Companies</h1>
          <CompaniesTable companies={companies} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
