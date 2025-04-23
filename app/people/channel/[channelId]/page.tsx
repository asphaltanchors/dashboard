import { db } from "@/db";
import { sql, and, eq, gte, lte, desc } from "drizzle-orm";
import { ordersInAnalytics, customersInAnalytics, customerEmailsInAnalytics } from "@/db/schema";
import { getDateRangeFromTimeFrame } from "@/app/utils/dates";
import { formatCurrency } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function PeopleChannelPage(
  props: {
    params: Promise<{ channelId: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const channelId = params.channelId;
  const channelName = decodeURIComponent(channelId); // Decode the channel name from URL

  // Handle search params safely for date range
  const range = searchParams && searchParams.range
    ? Array.isArray(searchParams.range)
      ? searchParams.range[0]
      : searchParams.range
    : "last-12-months";

  // Calculate date ranges
  const dateRange = getDateRangeFromTimeFrame(range);
  const { formattedStartDate, formattedEndDate, displayText } = dateRange;

  // Query to get people who have placed orders through this channel (no date filter)
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
      customerType: customersInAnalytics.customerType,
      orderCount: sql<string>`COUNT(${ordersInAnalytics.orderNumber})`.mapWith(String),
      totalSpent: sql<string>`SUM(${ordersInAnalytics.totalAmount})`.mapWith(String),
      lastOrderDate: sql<string>`MAX(${ordersInAnalytics.orderDate})`.mapWith(String),
    })
    .from(customersInAnalytics)
    .innerJoin(
      ordersInAnalytics,
      eq(customersInAnalytics.customerName, ordersInAnalytics.customerName)
    )
    .where(
      eq(ordersInAnalytics.class, channelName)
    )
    .groupBy(
      customersInAnalytics.firstName,
      customersInAnalytics.lastName,
      customersInAnalytics.email,
      customersInAnalytics.customerName,
      customersInAnalytics.customerType
    )
    .orderBy(desc(sql`SUM(${ordersInAnalytics.totalAmount})`));

  // Query to get summary metrics for this channel (no date filter)
  const channelSummaryPromise = db
    .select({
      totalPeople: sql<number>`COUNT(DISTINCT ${customersInAnalytics.customerName})`,
      totalOrders: sql<number>`COUNT(${ordersInAnalytics.orderNumber})`,
      totalRevenue: sql<number>`SUM(${ordersInAnalytics.totalAmount})`,
      avgOrderValue: sql<number>`AVG(${ordersInAnalytics.totalAmount})`,
    })
    .from(ordersInAnalytics)
    .innerJoin(
      customersInAnalytics,
      eq(ordersInAnalytics.customerName, customersInAnalytics.customerName)
    )
    .where(
      eq(ordersInAnalytics.class, channelName)
    );

  // Wait for all promises
  const [people, channelSummary] = await Promise.all([
    peoplePromise,
    channelSummaryPromise,
  ]);

  // Clean channel name for display (e.g., remove 'Amazon Combined:')
  const displayChannelName = channelName.startsWith('Amazon Combined:')
    ? channelName.split(':')[1].trim()
    : channelName;

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
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Header */}
              <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                  <h1 className="text-2xl font-bold">People: {displayChannelName}</h1>
                  <p className="text-muted-foreground">
                    Customers who placed orders through {displayChannelName} channel
                  </p>
                </div>
                <h2 className="text-lg font-medium">{displayText}</h2>
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
                      {formatNumber(channelSummary[0]?.totalPeople || 0)}
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
                      {formatNumber(channelSummary[0]?.totalOrders || 0)}
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
                      {formatCurrency(Number(channelSummary[0]?.totalRevenue || 0))}
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
                      {formatCurrency(Number(channelSummary[0]?.avgOrderValue || 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* People Table */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>People</CardTitle>
                    <CardDescription>
                      Customers who have placed orders through the {displayChannelName} channel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Customer/Company</TableHead>
                          <TableHead>Type</TableHead>
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
                              {person.email || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {person.customerName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {person.customerType || 'N/A'}
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
                              No people found for this channel in the selected time period
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
    </SidebarProvider>
  );
}
