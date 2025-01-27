import { CompaniesTable } from "@/components/companies/companies-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { getCompanies } from "@/lib/companies"
import { Building, Plus } from "lucide-react"
import { EnrichButton } from "@/components/companies/enrich-button"

export default async function CompaniesPage(
  props: {
    searchParams: { [key: string]: string | string[] | undefined }
  }
) {
  const searchParams = props.searchParams;
  const page = Number(searchParams.page) || 1
  const search = (searchParams.search as string) || ""
  const sort = (searchParams.sort as string) || "domain"
  const dir = (searchParams.dir as "asc" | "desc") || "asc"

  const data = await getCompanies({
    page,
    pageSize: 10,
    searchTerm: search,
    sortColumn: sort,
    sortDirection: dir,
  })
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Companies</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Companies"
              value={data.totalCount}
              change=""
              icon={Building}
              action={<EnrichButton companies={data.companies} />}
            />
            <MetricCard
              title="New Companies (30d)"
              value={data.recentCount}
              change={(data.recentCount / data.totalCount * 100).toFixed(1)}
              icon={Plus}
            />
      </div>
      <div className="mt-4">
        <CompaniesTable initialCompanies={data} />
      </div>
    </div>
  )
}
