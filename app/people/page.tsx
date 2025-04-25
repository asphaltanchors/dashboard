import { db } from "@/db"
import { sql } from "drizzle-orm"
import { ordersInAnalytics, customersInAnalytics, customerEmailsInAnalytics } from "@/db/schema"
import { count, eq } from "drizzle-orm"
import { getDateRangeFromTimeFrame } from "@/app/utils/dates"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

export default async function PeoplePage(
  props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  // Handle search params safely
  const range = searchParams?.range
    ? Array.isArray(searchParams.range)
      ? searchParams.range[0]
      : searchParams.range
    : "last-12-months"

  // Calculate date range based on the selected time frame
  const dateRange = getDateRangeFromTimeFrame(range)

  // Query for Sales Channels with customer counts (no date filter)
  const channelsPromise = db
    .select({
      channel: ordersInAnalytics.class,
      customerCount: count(sql`DISTINCT ${ordersInAnalytics.customerName}`),
      orderCount: count(ordersInAnalytics.orderNumber),
    })
    .from(ordersInAnalytics)
    .where(
      sql`${ordersInAnalytics.class} IS NOT NULL`
    )
    .groupBy(ordersInAnalytics.class)
    .orderBy(sql`COUNT(DISTINCT ${ordersInAnalytics.customerName}) DESC`);

  // Query for Customer Types with counts
  const customerTypesPromise = db
    .select({
      customerType: customersInAnalytics.customerType,
      customerCount: count(sql`DISTINCT ${customersInAnalytics.customerName}`),
      emailCount: count(sql`DISTINCT ${customerEmailsInAnalytics.emailAddress}`),
    })
    .from(customersInAnalytics)
    .leftJoin(
      customerEmailsInAnalytics,
      eq(customersInAnalytics.customerName, customerEmailsInAnalytics.customerName)
    )
    .where(
      sql`${customersInAnalytics.customerType} IS NOT NULL AND ${customersInAnalytics.customerType} != ''`
    )
    .groupBy(customersInAnalytics.customerType)
    .orderBy(sql`COUNT(DISTINCT ${customersInAnalytics.customerName}) DESC`);

  // Helper function to join all data fetching promises and render UI
  async function PeoplePageContent() {
    // Wait for data to be fetched
    const [channels, customerTypes] = await Promise.all([
      channelsPromise,
      customerTypesPromise
    ]);

    // Helper function to format numbers
    const formatNumber = (value: number | null | undefined) => {
      if (value === null || value === undefined) return "0";
      return new Intl.NumberFormat("en-US").format(value);
    };

    return (
      <>
        <div className="flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold">People</h1>
          <h2 className="text-lg font-medium">
            {dateRange.displayText}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 mt-6 lg:grid-cols-2">
          {/* Sales Channel Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select by Sales Channel</CardTitle>
              <CardDescription>
                View people who have placed orders through a specific channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">People</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.channel}>
                      <TableCell>
                        <Link 
                          href={`/people/channel/${encodeURIComponent(channel.channel || '')}?range=${range}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {channel.channel?.startsWith('Amazon Combined:')
                            ? channel.channel.split(':')[1].trim()
                            : channel.channel || 'Unknown'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(channel.customerCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(channel.orderCount)}</TableCell>
                    </TableRow>
                  ))}
                  {channels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No channels found in the selected time period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Customer Type Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select by Customer Type</CardTitle>
              <CardDescription>
                View people categorized by their customer type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Type</TableHead>
                    <TableHead className="text-right">People</TableHead>
                    <TableHead className="text-right">Emails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerTypes.map((type) => (
                    <TableRow key={type.customerType}>
                      <TableCell>
                        <Link 
                          href={`/people/customer-type/${encodeURIComponent(type.customerType || '')}?range=${range}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {type.customerType || 'Uncategorized'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(type.customerCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(type.emailCount)}</TableCell>
                    </TableRow>
                  ))}
                  {customerTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No customer types found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
              <PeoplePageContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
