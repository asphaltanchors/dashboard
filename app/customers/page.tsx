import { CustomersTable } from "@/components/customers/customers-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { getCustomers } from "@/lib/customers"
import { Users, UserPlus } from "lucide-react"

export default async function CustomersPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1
  const search = (searchParams.search as string) || ""
  const sort = (searchParams.sort as string) || "customerName"
  const dir = (searchParams.dir as "asc" | "desc") || "asc"

  const data = await getCustomers({
    page,
    pageSize: 10,
    searchTerm: search,
    sortColumn: sort,
    sortDirection: dir,
  })
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Customers</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Customers"
              value={data.totalCount}
              change=""
              icon={Users}
            />
            <MetricCard
              title="New Customers (30d)"
              value={data.recentCount}
              change={(data.recentCount / data.totalCount * 100).toFixed(1)}
              icon={UserPlus}
            />
      </div>
      <div className="mt-4">
        <CustomersTable initialCustomers={data} />
      </div>
    </div>
  )
}
