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

export default function CompaniesPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  // Get range param directly
  const rangeParam = searchParams?.range
  const range = rangeParam
    ? Array.isArray(rangeParam)
      ? rangeParam[0]
      : rangeParam
    : "last-12-months"
  
  // Calculate date range based on the selected time frame
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate } = dateRange

  // Query to get total number of companies
  const totalCompaniesPromise = db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(companies)

  // Query to get companies with customers
  const companiesWithCustomersPromise = db
    .select({
      count: sql<number>`count(DISTINCT ${companies.companyId})`.as("count"),
    })
    .from(companies)
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
      sql`created_at >= ${formattedStartDate} AND created_at <= ${formattedEndDate}`
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
    .leftJoin(
      customers,
      sql`${companies.companyId} = ${customers.companyId}`
    )
    .groupBy(companies.companyId, companies.companyName, companies.companyDomain)
    .having(sql`count(DISTINCT ${customers.quickbooksId}) > 0`)
    .orderBy(sql`customer_count DESC`)
    .limit(10)

  // Query to get recent companies (sorted by creation date)
  const recentCompaniesPromise = db
    .select({
      companyId: companies.companyId,
      companyName: companies.companyName,
      companyDomain: companies.companyDomain,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .orderBy(sql`created_at DESC`)
    .limit(10)

  // Query to get recent orders by company in the selected time frame
  const recentCompanyOrdersPromise = db
    .select({
      companyId: companies.companyId,
      companyName: companies.companyName,
      orderNumber: orders.orderNumber,
      orderDate: orders.orderDate,
      totalAmount: orders.totalAmount,
      customerName: orders.customerName,
    })
    .from(companies)
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
    .orderBy(sql`${orders.orderDate} DESC`)
    .limit(10)

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
      recentCompanies,
      recentCompanyOrders,
    ] = await Promise.all([
      totalCompaniesPromise,
      companiesWithCustomersPromise,
      companiesWithOrdersPromise,
      newCompaniesPromise,
      topCompaniesByRevenuePromise,
      topCompaniesByCustomersPromise,
      recentCompaniesPromise,
      recentCompanyOrdersPromise,
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

        <div className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recently Added Companies</CardTitle>
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
                    {recentCompanies.map((company, index) => (
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
                    {recentCompanies.length === 0 && (
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
              <CardTitle>Recent Company Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCompanyOrders.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/companies/${encodeURIComponent(order.companyId || '')}?range=${range}`}
                            className="text-primary hover:underline"
                          >
                            {order.companyName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/orders/${encodeURIComponent(
                              order.orderNumber || ''
                            )}?range=${range}`}
                            className="text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(order.totalAmount || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentCompanyOrders.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No orders found for the selected date range
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
