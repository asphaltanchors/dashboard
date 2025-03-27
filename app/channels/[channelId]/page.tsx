import { db } from "@/db";
import { sql, desc, sum, count, eq, and, gte, lte } from "drizzle-orm";
import { orders, orderItems, products, orderCompanyView } from "@/db/schema";
import Link from "next/link";
import { getDateRangeFromTimeFrame, getPreviousDateRange } from "@/app/utils/dates";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartAreaInteractive } from "@/components/chart-area-interactive"; // Assuming this chart can be reused
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

// Helper function to format currency
const formatCurrency = (value: string | number | null | undefined) => { // Accept string or number
  if (value === null || value === undefined || value === '') return "$0"; // Handle empty string too
  const numValue = Number(value); // Convert to number
  if (isNaN(numValue)) return "$0"; // Handle invalid numbers
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numValue); // Format the converted number
};

// Helper function to format numbers
const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(value);
};

export default async function ChannelDetailPage(
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
  const { formattedStartDate, formattedEndDate, startDate, endDate, displayText } = dateRange;
  const previousDateRange = getPreviousDateRange(startDate, endDate);
  const { formattedStartDate: prevFormattedStartDate, formattedEndDate: prevFormattedEndDate } = previousDateRange;

  // --- Data Fetching for the Specific Channel ---

  // 1. Summary Metrics (Current Period)
  const currentSummaryPromise = db
    .select({
      totalOrders: count(orders.orderNumber).mapWith(Number),
      totalRevenue: sum(orders.totalAmount).mapWith(Number),
      avgOrderValue: sql<number>`AVG(total_amount)`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.class, channelName),
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate)
      )
    );

  // 2. Summary Metrics (Previous Period)
  const previousSummaryPromise = db
    .select({
      totalOrders: count(orders.orderNumber).mapWith(Number),
      totalRevenue: sum(orders.totalAmount).mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.class, channelName),
        gte(orders.orderDate, prevFormattedStartDate),
        lte(orders.orderDate, prevFormattedEndDate)
      )
    );

  // 3. Revenue Over Time (Monthly)
  const revenueByMonthPromise = db
    .select({
      month: sql<string>`TO_CHAR(order_date, 'YYYY-MM')`.as('month'),
      revenue: sum(orders.totalAmount).mapWith(Number),
      orderCount: count(orders.orderNumber).mapWith(Number),
    })
    .from(orders)
    .where(
      // Remove date range filter to show all time for this chart
      eq(orders.class, channelName) 
    )
    .groupBy(sql`month`)
    .orderBy(sql`month ASC`);

  // 4. Top Selling Products within Channel
  const topSellingProductsPromise = db
    .select({
      productCode: orderItems.productCode,
      productDescription: orderItems.productDescription,
      totalQuantity: sum(sql`CAST(quantity AS NUMERIC)`).mapWith(Number),
      totalRevenue: sum(orderItems.lineAmount).mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.orderNumber, orderItems.orderNumber))
    .where(
      and(
        eq(orders.class, channelName),
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate),
        sql`quantity IS NOT NULL AND CAST(quantity AS NUMERIC) > 0`
      )
    )
    .groupBy(orderItems.productCode, orderItems.productDescription)
    .orderBy(desc(sql`SUM(line_amount)`))
    .limit(10);

  // 5. Recent Orders within Channel
  const recentOrdersPromise = db
    .select({
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      orderDate: orders.orderDate,
      totalAmount: orders.totalAmount,
      status: orders.status,
      companyName: orderCompanyView.companyName, // Join with view for company name
    })
    .from(orders)
    .leftJoin(orderCompanyView, eq(orders.quickbooksId, orderCompanyView.quickbooksId)) // Join based on quickbooksId
    .where(
      and(
        eq(orders.class, channelName),
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate)
      )
    )
    .orderBy(desc(orders.orderDate))
    .limit(10);

  // 6. Top Companies buying through Channel
  const topCompaniesPromise = db
    .select({
      companyId: orderCompanyView.companyId,
      companyName: orderCompanyView.companyName,
      companyDomain: orderCompanyView.companyDomain,
      orderCount: count(orderCompanyView.orderNumber).mapWith(Number),
      totalSpent: sum(orderCompanyView.totalAmount).mapWith(Number),
    })
    .from(orderCompanyView)
    .innerJoin(orders, eq(orders.quickbooksId, orderCompanyView.quickbooksId)) // Join orders to filter by class
    .where(
      and(
        eq(orders.class, channelName),
        gte(orderCompanyView.orderDate, formattedStartDate),
        lte(orderCompanyView.orderDate, formattedEndDate)
      )
    )
    .groupBy(orderCompanyView.companyId, orderCompanyView.companyName, orderCompanyView.companyDomain)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // 7. Revenue by Product Family within Channel
  const revenueByFamilyPromise = db
    .select({
      family: products.productFamily,
      revenue: sum(orderItems.lineAmount).mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.orderNumber, orderItems.orderNumber))
    .innerJoin(products, eq(products.itemName, orderItems.productCode)) // Assuming productCode matches itemName
    .where(
      and(
        eq(orders.class, channelName),
        gte(orders.orderDate, formattedStartDate),
        lte(orders.orderDate, formattedEndDate),
        sql`${products.productFamily} IS NOT NULL`
      )
    )
    .groupBy(products.productFamily)
    .orderBy(desc(sql`SUM(line_amount)`));


  // Wait for all promises
  const [
    currentSummary,
    previousSummary,
    revenueByMonth,
    topSellingProducts,
    recentOrders,
    topCompanies,
    revenueByFamily,
  ] = await Promise.all([
    currentSummaryPromise,
    previousSummaryPromise,
    revenueByMonthPromise,
    topSellingProductsPromise,
    recentOrdersPromise,
    topCompaniesPromise,
    revenueByFamilyPromise,
  ]);

  // Process Summary Data & Trends
  const summary = currentSummary[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
  const prevSummary = previousSummary[0] || { totalOrders: 0, totalRevenue: 0 };

  const orderTrend = summary.totalOrders - prevSummary.totalOrders;
  const revenueTrend = summary.totalRevenue - prevSummary.totalRevenue;
  const orderTrendPercent = prevSummary.totalOrders === 0 ? (summary.totalOrders > 0 ? Infinity : 0) : Math.round((orderTrend / prevSummary.totalOrders) * 100);
  const revenueTrendPercent = prevSummary.totalRevenue === 0 ? (summary.totalRevenue > 0 ? Infinity : 0) : Math.round((revenueTrend / prevSummary.totalRevenue) * 100);

  // Process Chart Data
  const chartData = revenueByMonth.map((item) => ({
    date: item.month,
    revenue: item.revenue || 0,
    orders: item.orderCount || 0,
  }));

  // Clean channel name for display (e.g., remove 'Amazon Combined:')
  const displayChannelName = channelName.startsWith('Amazon Combined:')
    ? channelName.split(':')[1].trim()
    : channelName;

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
                <h1 className="text-2xl font-bold">Channel: {displayChannelName}</h1>
                <h2 className="text-lg font-medium">{displayText}</h2>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardDescription>Total Orders</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{formatNumber(summary.totalOrders)}</CardTitle>
                    {orderTrendPercent !== Infinity && orderTrendPercent !== 0 && (
                      <Badge variant={orderTrend >= 0 ? "default" : "destructive"} className="mt-1">
                        {orderTrend >= 0 ? <IconTrendingUp className="mr-1 h-4 w-4" /> : <IconTrendingDown className="mr-1 h-4 w-4" />}
                        {orderTrendPercent}% vs prev. period
                      </Badge>
                    )}
                     {orderTrendPercent === Infinity && <Badge variant="default" className="mt-1">(New Activity)</Badge>}
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{formatCurrency(summary.totalRevenue)}</CardTitle>
                     {revenueTrendPercent !== Infinity && revenueTrendPercent !== 0 && (
                      <Badge variant={revenueTrend >= 0 ? "default" : "destructive"} className="mt-1">
                        {revenueTrend >= 0 ? <IconTrendingUp className="mr-1 h-4 w-4" /> : <IconTrendingDown className="mr-1 h-4 w-4" />}
                        {revenueTrendPercent}% vs prev. period
                      </Badge>
                    )}
                    {revenueTrendPercent === Infinity && <Badge variant="default" className="mt-1">(New Activity)</Badge>}
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Avg. Order Value</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{formatCurrency(summary.avgOrderValue)}</CardTitle>
                    {/* Trend for AOV could be added if needed */}
                  </CardHeader>
                </Card>
              </div>

              {/* Revenue Chart */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Over Time</CardTitle>
                    {/* Update description to reflect all-time data */}
                    <CardDescription>All-time monthly revenue for {displayChannelName}</CardDescription> 
                  </CardHeader>
                  <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <ChartAreaInteractive data={chartData} />
                  </CardContent>
                </Card>
              </div>

              {/* Top Products & Recent Orders */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>Most popular products in this channel ({displayText})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topSellingProducts.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Link href={`/products/${encodeURIComponent(product.productCode || '')}?range=${range}`} className="font-medium hover:underline">
                                {product.productCode}
                              </Link>
                              <div className="text-xs text-muted-foreground truncate max-w-xs">{product.productDescription}</div>
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(product.totalQuantity)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.totalRevenue)}</TableCell>
                          </TableRow>
                        ))}
                         {topSellingProducts.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No product sales data</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Latest orders placed via this channel ({displayText})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentOrders.map((order) => (
                          <TableRow key={order.orderNumber}>
                            <TableCell>
                              <Link href={`/orders/${encodeURIComponent(order.orderNumber || '')}?range=${range}`} className="font-medium hover:underline">
                                {order.orderNumber}
                              </Link>
                            </TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{order.companyName || 'N/A'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                        {recentOrders.length === 0 && (
                           <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No recent orders</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

               {/* Top Companies & Revenue by Family */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Companies</CardTitle>
                    <CardDescription>Companies ordering most frequently via this channel ({displayText})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Total Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCompanies.map((company, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">{company.companyName || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{company.companyDomain || '-'}</div>
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(company.orderCount)}</TableCell>
                            {/* No need for explicit Number() conversion here anymore */}
                            <TableCell className="text-right">{formatCurrency(company.totalSpent)}</TableCell> 
                          </TableRow>
                        ))}
                         {topCompanies.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No company data</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Product Family</CardTitle>
                    <CardDescription>Breakdown of revenue by family for this channel ({displayText})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Family</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueByFamily.map((family, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{family.family || 'Uncategorized'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(family.revenue)}</TableCell>
                          </TableRow>
                        ))}
                         {revenueByFamily.length === 0 && (
                          <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No family revenue data</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
