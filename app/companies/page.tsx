import { db } from "@/db"
import { sql } from "drizzle-orm"
import { companies, companyOrderMapping, customers, orders } from "@/db/schema"
import Link from "next/link"
import { getDateRangeFromTimeFrame } from "@/app/utils/dates"
import { formatCurrency } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function CompaniesPage(
  props: {
    searchParams: Promise<{ 
      range?: string | string[];
      page?: string | string[];
      search?: string | string[];
    }>
  }
) {
  const searchParams = await props.searchParams;
  // Get range param from searchParams
  const rangeParam = searchParams.range
  const range = rangeParam
    ? Array.isArray(rangeParam)
      ? rangeParam[0]
      : rangeParam
    : "last-12-months"
    
  // Get page param from searchParams
  const pageParam = searchParams.page
  const page = pageParam
    ? parseInt(Array.isArray(pageParam) ? pageParam[0] : pageParam)
    : 1
    
  // Get search param from searchParams
  const searchParam = searchParams.search
  const search = searchParam
    ? Array.isArray(searchParam)
      ? searchParam[0]
      : searchParam
    : ""
    
  // Items per page
  const pageSize = 20
  const offset = (page - 1) * pageSize

  // Calculate date range based on the selected time frame
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate } = dateRange

  // Query to get total number of companies
  const totalCompaniesPromise = db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(companies)
    .where(sql`${companies.isConsumerDomain} = false`)

  // Query to get companies with customers
  const companiesWithCustomersPromise = db
    .select({
      count: sql<number>`count(DISTINCT ${companies.companyId})`.as("count"),
    })
    .from(companies)
    .where(sql`${companies.isConsumerDomain} = false`)
    .innerJoin(
      customers,
      sql`${companies.companyId} = ${customers.companyId}`
    )

  // Query to get companies with orders
  const companiesWithOrdersPromise = db
    .select({
      count: sql<number>`count(DISTINCT ${companies.companyId})`.as("count"),
    })
    .from(companies)
    .where(sql`${companies.isConsumerDomain} = false`)
    .innerJoin(
      companyOrderMapping,
      sql`${companies.companyId} = ${companyOrderMapping.companyId}`
    )

  // Query to get new companies in the selected time frame
  const newCompaniesPromise = db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(companies)
    .where(
      sql`${companies.isConsumerDomain} = false AND created_at >= ${formattedStartDate} AND created_at <= ${formattedEndDate}`
    )

  // Query to get top companies by revenue in the selected time frame
  const topCompaniesByRevenuePromise = db
    .select({
      companyId: companies.companyId,
      companyName: companies.companyName,
      companyDomain: companies.companyDomain,
      totalRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`.as("total_revenue"),
      orderCount: sql<number>`COUNT(DISTINCT ${orders.orderNumber})`.as("order_count"),
    })
    .from(companies)
    .where(sql`${companies.isConsumerDomain} = false`)
    .innerJoin(
      companyOrderMapping,
      sql`${companies.companyId} = ${companyOrderMapping.companyId}`
    )
    .innerJoin(
      orders,
      sql`${companyOrderMapping.orderNumber} = ${orders.orderNumber} 
        AND ${orders.orderDate} >= ${formattedStartDate} 
        AND ${orders.orderDate} <= ${formattedEndDate}`
    )
    .groupBy(companies.companyId, companies.companyName, companies.companyDomain)
    .orderBy(sql`total_revenue DESC`)
    .limit(10)

  // Query to get top companies by customer count
  const topCompaniesByCustomersPromise = db
    .select({
      companyId: companies.companyId,
      companyName: companies.companyName,
      companyDomain: companies.companyDomain,
      customerCount: sql<number>`count(DISTINCT ${customers.quickbooksId})`.as(
        "customer_count"
      ),
    })
    .from(companies)
    .where(sql`${companies.isConsumerDomain} = false`)
    .leftJoin(
      customers,
      sql`${companies.companyId} = ${customers.companyId}`
    )
    .groupBy(companies.companyId, companies.companyName, companies.companyDomain)
    .having(sql`count(DISTINCT ${customers.quickbooksId}) > 0`)
    .orderBy(sql`customer_count DESC`)
    .limit(10)

  // Create search condition for companies
  const searchCondition = search 
    ? sql`${companies.companyName} ILIKE ${'%' + search + '%'} OR ${companies.companyDomain} ILIKE ${'%' + search + '%'}`
    : sql`1=1`

  // Query to get all companies with pagination and search
  const allCompaniesPromise = db
    .select({
      companyId: companies.companyId,
      companyName: companies.companyName,
      companyDomain: companies.companyDomain,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .where(sql`${companies.isConsumerDomain} = false AND (${searchCondition})`)
    .orderBy(sql`created_at DESC`)
    .limit(pageSize)
    .offset(offset)
    
  // Get total count for pagination
  const totalCompaniesCountPromise = db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(companies)
    .where(sql`${companies.isConsumerDomain} = false AND (${searchCondition})`)

  // Helper function to join all data fetching promises and render UI
  async function CompaniesContent() {
    // Wait for all data to be fetched in parallel
    const [
      totalCompaniesResult,
      companiesWithCustomersResult,
      companiesWithOrdersResult,
      newCompaniesResult,
      topCompaniesByRevenue,
      topCompaniesByCustomers,
      allCompanies,
      totalCompaniesCount,
    ] = await Promise.all([
      totalCompaniesPromise,
      companiesWithCustomersPromise,
      companiesWithOrdersPromise,
      newCompaniesPromise,
      topCompaniesByRevenuePromise,
      topCompaniesByCustomersPromise,
      allCompaniesPromise,
      totalCompaniesCountPromise,
    ])

    const totalCompanies = totalCompaniesResult[0]?.count || 0
    const companiesWithCustomers = companiesWithCustomersResult[0]?.count || 0
    const companiesWithOrders = companiesWithOrdersResult[0]?.count || 0
    const newCompanies = newCompaniesResult[0]?.count || 0

    return (
      <>
        <div className="flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Companies</h1>
          <h2 className="text-lg font-medium">
            {dateRange.displayText}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalCompanies.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Companies with Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {companiesWithOrders.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {((companiesWithOrders / totalCompanies) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                New Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {newCompanies.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {((newCompanies / totalCompanies) * 100).toFixed(1)}% growth
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Companies by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCompaniesByRevenue.map((company, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">
                            <Link
                              href={`/companies/${encodeURIComponent(company.companyId || '')}?range=${range}`}
                              className="text-primary hover:underline"
                            >
                              {company.companyName}
                            </Link>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {company.companyDomain}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(company.orderCount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(company.totalRevenue || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {topCompaniesByRevenue.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Companies by Customer Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead className="text-right">Customers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCompaniesByCustomers.map((company, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/companies/${encodeURIComponent(company.companyId || '')}?range=${range}`}
                            className="text-primary hover:underline"
                          >
                            {company.companyName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.companyDomain}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(company.customerCount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {topCompaniesByCustomers.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="px-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Companies</CardTitle>
              <div className="relative w-64">
                <form>
                  <input
                    type="text"
                    name="search"
                    placeholder="Search by name or domain..."
                    defaultValue={search}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead className="text-right">Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCompanies.map((company, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/companies/${encodeURIComponent(company.companyId || '')}?range=${range}`}
                            className="text-primary hover:underline"
                          >
                            {company.companyName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.companyDomain}
                        </TableCell>
                        <TableCell className="text-right">
                          {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {allCompanies.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-6 text-center text-muted-foreground"
                        >
                          {search ? 'No companies found matching your search' : 'No data available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalCompaniesCount[0]?.count > 0 && (
                <div className="flex items-center justify-between space-x-6 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {allCompanies.length > 0 ? offset + 1 : 0} to {Math.min(offset + pageSize, totalCompaniesCount[0]?.count)} of {totalCompaniesCount[0]?.count} companies
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/companies?range=${range}&page=${Math.max(1, page - 1)}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                      className={`rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                      aria-disabled={page <= 1}
                    >
                      Previous
                    </Link>
                    <Link
                      href={`/companies?range=${range}&page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                      className={`rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground ${(page * pageSize) >= totalCompaniesCount[0]?.count ? 'pointer-events-none opacity-50' : ''}`}
                      aria-disabled={(page * pageSize) >= totalCompaniesCount[0]?.count}
                    >
                      Next
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="px-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Companies Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Companies with Customers</h3>
                  <p className="text-2xl font-bold text-primary">
                    {((companiesWithCustomers / totalCompanies) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {companiesWithCustomers.toLocaleString()} out of{" "}
                    {totalCompanies.toLocaleString()} companies
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Companies with Orders</h3>
                  <p className="text-2xl font-bold text-primary">
                    {((companiesWithOrders / totalCompanies) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {companiesWithOrders.toLocaleString()} out of{" "}
                    {totalCompanies.toLocaleString()} companies
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 py-6">
              <CompaniesContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
