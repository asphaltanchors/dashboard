import { CompanyCard } from "@/components/companies/company-card"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SearchInput } from "@/components/search-input"
import { SortDropdown } from "@/components/sort-dropdown"
import { ReportHeader } from "@/components/reports/report-header"
import { getCompanies } from "@/lib/companies"
import { Building, Plus } from "lucide-react"

export default async function CompaniesPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const search = (searchParams.search as string) || ""
  const sort = (searchParams.sort as string) || "totalOrders"
  const filterConsumer = searchParams.filterConsumer !== "false"

  const data = await getCompanies({
    pageSize: 20,
    searchTerm: search,
    sortColumn: sort,
    sortDirection: 'desc', // Always descending as specified
    filterConsumer
  })

  return (
    <div className="p-8">
      <ReportHeader 
        title="Companies"
        resetPath="/companies"
        filterConsumer={filterConsumer}
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 mt-8">
        <MetricCard
          title="Total Companies"
          value={data.totalCount}
          change=""
          icon={Building}
        />
        <MetricCard
          title="New Companies (30d)"
          value={data.recentCount}
          change={(data.recentCount / data.totalCount * 100).toFixed(1)}
          icon={Plus}
        />
      </div>
      
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <SearchInput 
            placeholder="Search by name or domain..."
            defaultValue={search}
          />
        </div>
        <div className="w-40">
          <SortDropdown value={sort} />
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.companies.map(company => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  )
}
