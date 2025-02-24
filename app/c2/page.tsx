import { CompanyCard } from "@/components/companies/company-card"
import { ReportHeader } from "@/components/reports/report-header"
import { getCompanies } from "@/lib/companies"

export default async function CompaniesPage() {
  const data = await getCompanies({
    pageSize: 20,
    sortColumn: 'totalOrders',
    sortDirection: 'desc',
    filterConsumer: true
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <ReportHeader
          title="Companies"
          resetPath="/c2"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.companies.map(company => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  )
}
