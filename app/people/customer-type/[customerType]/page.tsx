import { db } from "@/db";
import { sql, eq, desc } from "drizzle-orm";
import { ordersInAnalytics, customersInAnalytics } from "@/db/schema";
import { getDateRangeFromTimeFrame } from "@/app/utils/dates";
import { formatCurrency } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportCSVButton } from "@/components/export-csv-button";
import Link from "next/link";

export default async function PeopleCustomerTypePage(
  props: {
    params: Promise<{ customerType: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const customerTypeId = params.customerType;
  const customerType = decodeURIComponent(customerTypeId); // Decode the customer type from URL

  // Handle search params safely for date range
  const range = searchParams && searchParams.range
    ? Array.isArray(searchParams.range)
      ? searchParams.range[0]
      : searchParams.range
    : "last-12-months";

  // Calculate date ranges
  const dateRange = getDateRangeFromTimeFrame(range);
  const { displayText } = dateRange;

  // Query to get people of this customer type (no date filter)
  const peoplePromise = db
    .select({
      firstName: customersInAnalytics.firstName,
      lastName: customersInAnalytics.lastName,
      email: sql<string>`COALESCE(
        (SELECT email_address FROM analytics.customer_emails 
         WHERE customer_name = ${customersInAnalytics.customerName} 
         AND is_primary_email = true 
         LIMIT 1),
        ${customersInAnalytics.email}
      )`.mapWith(String),
      customerName: customersInAnalytics.customerName,
      orderCount: sql<string>`COUNT(${ordersInAnalytics.orderNumber})`.mapWith(String),
      totalSpent: sql<string>`SUM(${ordersInAnalytics.totalAmount})`.mapWith(String),
      lastOrderDate: sql<string>`MAX(${ordersInAnalytics.orderDate})`.mapWith(String),
      channel: sql<string>`string_agg(DISTINCT ${ordersInAnalytics.sourcechannel}, ', ')`.mapWith(String),
      emailCount: sql<number>`(
        SELECT COUNT(*) FROM analytics.customer_emails 
        WHERE customer_name = ${customersInAnalytics.customerName}
      )`.mapWith(Number),
    })
    .from(customersInAnalytics)
    .leftJoin(
      ordersInAnalytics,
      eq(customersInAnalytics.customerName, ordersInAnalytics.customerName)
    )
    .where(
      sql`1=1` // Removing customerType filter since the field has been removed
    )
    .groupBy(
      customersInAnalytics.firstName,
      customersInAnalytics.lastName,
      customersInAnalytics.email,
      customersInAnalytics.customerName
    )
    .orderBy(desc(sql`SUM(${ordersInAnalytics.totalAmount})`));

  // Query to get summary metrics for this customer type (no date filter)
  const customerTypeSummaryPromise = db
    .select({
      totalPeople: sql<number>`COUNT(DISTINCT ${customersInAnalytics.customerName})`,
      totalOrders: sql<number>`COUNT(${ordersInAnalytics.orderNumber})`,
      totalRevenue: sql<number>`SUM(${ordersInAnalytics.totalAmount})`,
      avgOrderValue: sql<number>`AVG(${ordersInAnalytics.totalAmount})`,
    })
    .from(customersInAnalytics)
    .leftJoin(
      ordersInAnalytics,
      eq(customersInAnalytics.customerName, ordersInAnalytics.customerName)
    )
    .where(
      sql`1=1` // Removing customerType filter since the field has been removed
    );

  // Wait for all promises
  const [people, customerTypeSummary] = await Promise.all([
    peoplePromise,
    customerTypeSummaryPromise,
  ]);

  // Format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to format numbers
  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "0";
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    (<SidebarProvider
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
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Header */}
              <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                  <h1 className="text-2xl font-bold">People: {customerType || 'Uncategorized'}</h1>
                  <p className="text-muted-foreground">
                    Customers categorized as &quot;{customerType || 'Uncategorized'}&quot;
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-medium">{displayText}</h2>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total People
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatNumber(customerTypeSummary[0]?.totalPeople || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatNumber(customerTypeSummary[0]?.totalOrders || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(Number(customerTypeSummary[0]?.totalRevenue || 0))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg. Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(Number(customerTypeSummary[0]?.avgOrderValue || 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* People Table */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>People</CardTitle>
                      <CardDescription>
                        Customers categorized as &quot;{customerType || 'Uncategorized'}&quot;
                      </CardDescription>
                    </div>
                    <ExportCSVButton
                      data={people.map(person => ({
                        email: person.email || '',
                        firstName: person.firstName || '',
                        lastName: person.lastName || '',
                        customerName: person.customerName || '',
                        orderCount: person.orderCount || '0',
                        totalSpent: person.totalSpent || '0',
                        lastOrderDate: person.lastOrderDate || '',
                        channel: person.channel || ''
                      }))}
                      filename={`${customerType.toLowerCase().replace(/\s+/g, '-')}-customers.csv`}
                    />
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Primary Email</TableHead>
                          <TableHead>Customer/Company</TableHead>
                          <TableHead>Channels</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Total Spent</TableHead>
                          <TableHead className="text-right">Last Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {people.map((person, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">
                                {person.firstName && person.lastName 
                                  ? `${person.firstName} ${person.lastName}`
                                  : 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                {person.email || 'N/A'}
                              </div>
                              {person.emailCount > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  +{person.emailCount - 1} more emails
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {person.customerName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {person.channel || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              {person.orderCount || '0'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(Number(person.totalSpent || 0))}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatDate(person.lastOrderDate || '')}
                            </TableCell>
                          </TableRow>
                        ))}
                        {people.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No people found for this customer type in the selected time period
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Back Link */}
              <div className="px-4 lg:px-6">
                <Link 
                  href={`/people?range=${range}`}
                  className="text-primary hover:underline"
                >
                  ← Back to selectors
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>)
  );
}
