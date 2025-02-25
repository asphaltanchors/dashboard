import { CompanyCard } from "@/components/companies/company-card"
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
      <h1 className="text-3xl font-bold mb-8">Companies</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.companies.map(company => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  )
}
