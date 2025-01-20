import { AppSidebar } from "@/components/app-sidebar"
import { CompaniesTable } from "@/components/companies/companies-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCompanies } from "@/lib/companies"
import { Building, Plus } from "lucide-react"

export default async function CompaniesPage() {
  const { companies, totalCount, recentCount } = await getCompanies()
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Companies"
              value={totalCount}
              change=""
              icon={Building}
            />
            <MetricCard
              title="New Companies (30d)"
              value={recentCount}
              change={(recentCount / totalCount * 100).toFixed(1)}
              icon={Plus}
            />
          </div>
          <CompaniesTable companies={companies} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
