import Link from "next/link";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { ordersInAnalytics, orderItemsInAnalytics, customersInAnalytics, itemHistoryViewInAnalytics, orderCompanyViewInAnalytics } from "../db/schema";
import { getDateRangeFromTimeFrame } from "./utils/dates";
import { formatCurrency } from "@/lib/utils";

import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconShoppingCart, 
  IconCurrencyDollar, 
  IconCalculator,
  IconChartBar,
  IconBuildingStore,
  IconPackage,
  IconClipboardList
} from "@tabler/icons-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Wait for searchParams to be available
  const params = await searchParams || {};
  
  // Get range from URL params or default to last-12-months
  const range = (params.range as string) || 'last-12-months';
  const startDateParam = params.start as string | undefined;
  const endDateParam = params.end as string | undefined;
  
  // Calculate date range based on the selected range
  const {
    endDate,
    formattedStartDate,
    formattedEndDate
  } = getDateRangeFromTimeFrame(range, startDateParam, endDateParam);
  
  // Calculate previous period dates of equal length
  const startDate = new Date(formattedStartDate);
  const currentPeriodEndDate = new Date(formattedEndDate);
  
  // Calculate the length of the current period in milliseconds
  const periodLength = currentPeriodEndDate.getTime() - startDate.getTime();
  
  // Calculate previous period end date (day before current period starts)
  const previousPeriodEndDate = new Date(startDate);
  previousPeriodEndDate.setDate(previousPeriodEndDate.getDate() - 1);
  
  // Calculate previous period start date (same length as current period)
  const previousPeriodStartDate = new Date(previousPeriodEndDate);
  previousPeriodStartDate.setTime(previousPeriodEndDate.getTime() - periodLength);
  
  // Format dates for SQL queries
  const formattedPreviousPeriodStartDate = previousPeriodStartDate.toISOString().split('T')[0];
  const formattedPreviousPeriodEndDate = previousPeriodEndDate.toISOString().split('T')[0];
  
  // For backward compatibility with existing queries
  const formattedLast30Days = new Date(endDate);
  formattedLast30Days.setDate(endDate.getDate() - 30);

  // Query to get total orders and revenue within selected time frame
  const orderSummaryResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(ordersInAnalytics)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`);
  
  const totalOrders = orderSummaryResult[0]?.totalOrders || 0;
  const totalRevenue = orderSummaryResult[0]?.totalRevenue || 0;
  const avgOrderValue = orderSummaryResult[0]?.avgOrderValue || 0;
  
  // Query to get orders, revenue and avg order value for the previous period
  const previousPeriodResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(ordersInAnalytics)
  .where(sql`order_date BETWEEN ${formattedPreviousPeriodStartDate} AND ${formattedPreviousPeriodEndDate}`);
  
  const previousPeriodOrders = previousPeriodResult[0]?.totalOrders || 0;
  const previousPeriodRevenue = previousPeriodResult[0]?.totalRevenue || 0;
  const previousPeriodAvgOrderValue = previousPeriodResult[0]?.avgOrderValue || 0;
  
  // Calculate percentage change for orders
  const ordersChange = totalOrders - previousPeriodOrders;
  const ordersChangePercentage = previousPeriodOrders !== 0 
    ? (ordersChange / previousPeriodOrders) * 100 
    : 0;
  
  // Calculate percentage change for revenue
  const revenueChange = totalRevenue - previousPeriodRevenue;
  const revenueChangePercentage = previousPeriodRevenue !== 0 
    ? (revenueChange / previousPeriodRevenue) * 100 
    : 0;
  
  // Calculate percentage change for average order value
  const avgOrderValueChange = avgOrderValue - previousPeriodAvgOrderValue;
  const avgOrderValueChangePercentage = previousPeriodAvgOrderValue !== 0 
    ? (avgOrderValueChange / previousPeriodAvgOrderValue) * 100 
    : 0;
  
  // Format the percentage changes for display
  const formattedOrdersChangePercentage = ordersChangePercentage.toFixed(1);
  const formattedRevenueChangePercentage = revenueChangePercentage.toFixed(1);
  const formattedAvgOrderValueChangePercentage = avgOrderValueChangePercentage.toFixed(1);
  const isPositiveOrdersChange = ordersChange >= 0;
  const isPositiveRevenueChange = revenueChange >= 0;
  const isPositiveAvgOrderValueChange = avgOrderValueChange >= 0;

  // Query to get recent orders (last 30 days from the end date of selected range)
  // Not used in the UI, but kept for reference

  // Query to get top selling products within selected time frame
  const topSellingProducts = await db.select({
    productCode: orderItemsInAnalytics.productCode,
    productDescription: orderItemsInAnalytics.productDescription,
    totalQuantity: sql<number>`SUM(CAST(quantity AS NUMERIC))`.as('total_quantity'),
    totalRevenue: sql<number>`SUM(line_amount)`.as('total_revenue')
  })
  .from(orderItemsInAnalytics)
  .innerJoin(
    sql`analytics.orders`,
    sql`analytics.orders.order_number = ${orderItemsInAnalytics.orderNumber}`
  )
  .where(sql`quantity IS NOT NULL AND CAST(quantity AS NUMERIC) > 0 AND analytics.orders.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderItemsInAnalytics.productCode, orderItemsInAnalytics.productDescription)
  .orderBy(sql`total_quantity DESC`)
  .limit(5);

  // Query to get recent orders list within selected time frame
  const recentOrders = await db.select({
    orderNumber: ordersInAnalytics.orderNumber,
    customerName: ordersInAnalytics.customerName,
    orderDate: ordersInAnalytics.orderDate,
    totalAmount: ordersInAnalytics.totalAmount,
    status: ordersInAnalytics.status
  })
  .from(ordersInAnalytics)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .orderBy(sql`order_date DESC`)
  .limit(5);

  // Query to get orders by status within selected time frame
  const ordersByStatus = await db.select({
    status: ordersInAnalytics.status,
    count: sql<number>`count(*)`.as('count')
  })
  .from(ordersInAnalytics)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(ordersInAnalytics.status)
  .orderBy(sql`count DESC`);
  
  // We don't need to query orders by month since we're using all-time orders for the chart
  
  // Query to get all-time orders by month for the chart (ignoring date range)
  const allTimeOrdersByMonth = await db.select({
    month: sql<string>`TO_CHAR(order_date, 'YYYY-MM')`.as('month'),
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount')
  })
  .from(ordersInAnalytics)
  .groupBy(sql`month`)
  .orderBy(sql`month ASC`);
  
  // Query to get top companies by order count within selected time frame
  const topCompaniesByOrders = await db.select({
    companyId: orderCompanyViewInAnalytics.companyId,
    companyName: orderCompanyViewInAnalytics.companyName,
    companyDomain: orderCompanyViewInAnalytics.companyDomain,
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalSpent: sql<number>`SUM(total_amount)`.as('total_spent')
  })
  .from(orderCompanyViewInAnalytics)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderCompanyViewInAnalytics.companyId, orderCompanyViewInAnalytics.companyName, orderCompanyViewInAnalytics.companyDomain)
  .orderBy(sql`order_count DESC`)
  .limit(5);
  
  // Query to get recent product changes
  const recentProductChanges = await db.select({
    itemName: itemHistoryViewInAnalytics.itemName,
    salesDescription: itemHistoryViewInAnalytics.salesDescription,
    columnName: itemHistoryViewInAnalytics.columnName,
    oldValue: itemHistoryViewInAnalytics.oldValue,
    newValue: itemHistoryViewInAnalytics.newValue,
    changedAt: itemHistoryViewInAnalytics.changedAt,
    percentChange: itemHistoryViewInAnalytics.percentChange
  })
  .from(itemHistoryViewInAnalytics)
  .orderBy(sql`changed_at DESC`)
  .limit(5);
  
  // Query to get customer types distribution
  const customerTypeDistribution = await db.select({
    customerType: customersInAnalytics.customerType,
    count: sql<number>`count(*)`.as('count')
  })
  .from(customersInAnalytics)
  .groupBy(customersInAnalytics.customerType)
  .orderBy(sql`count DESC`);
  
  // We don't need to query company match distribution since it's not used in the UI


  // Convert all-time orders data for the chart
  const chartData = allTimeOrdersByMonth.map((item) => ({
    date: item.month,
    orders: item.orderCount,
    revenue: Number(item.totalAmount)
  }));

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
              {/* Custom Metric Cards */}
              <div className="dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-1">
                      <IconShoppingCart className="size-4" />
                      Total Orders
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {totalOrders.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                      <Badge variant={isPositiveOrdersChange ? "outline" : "destructive"}>
                        {isPositiveOrdersChange ? <IconTrendingUp /> : <IconTrendingDown />}
                        {isPositiveOrdersChange ? '+' : ''}{formattedOrdersChangePercentage}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  {/* Card footer removed */}
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-1">
                      <IconCurrencyDollar className="size-4" />
                      Total Revenue
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatCurrency(Number(totalRevenue))}
                    </CardTitle>
                    <CardAction>
                      <Badge variant={isPositiveRevenueChange ? "outline" : "destructive"}>
                        {isPositiveRevenueChange ? <IconTrendingUp /> : <IconTrendingDown />}
                        {isPositiveRevenueChange ? '+' : ''}{formattedRevenueChangePercentage}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  {/* Card footer removed */}
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-1">
                      <IconCalculator className="size-4" />
                      Avg Order Value
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatCurrency(Number(avgOrderValue))}
                    </CardTitle>
                    <CardAction>
                      <Badge variant={isPositiveAvgOrderValueChange ? "outline" : "destructive"}>
                        {isPositiveAvgOrderValueChange ? <IconTrendingUp /> : <IconTrendingDown />}
                        {isPositiveAvgOrderValueChange ? '+' : ''}{formattedAvgOrderValueChangePercentage}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  {/* Card footer removed */}
                </Card>
              </div>
              
              {/* Revenue Chart */}
              <div className="px-4 lg:px-6">
                <Card className="@container/card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1">
                      <IconChartBar className="size-5" />
                      Revenue Over Time
                    </CardTitle>
                    <CardDescription>
                      <span>All-time monthly revenue trends</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <ChartAreaInteractive data={chartData} />
                  </CardContent>
                </Card>
              </div>
              
              {/* Recent Orders and Top Products Tables */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-1">
                        <IconClipboardList className="size-5" />
                        Recent Orders
                      </CardTitle>
                      <CardDescription>Recent customer orders</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/orders">View All</Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentOrders.map((order) => {
                          const orderDate = order.orderDate ? new Date(order.orderDate) : null;
                          const formattedDate = orderDate ? 
                            orderDate.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'N/A';
                          
                          return (
                            <TableRow key={order.orderNumber}>
                              <TableCell className="font-medium">{order.orderNumber}</TableCell>
                              <TableCell>{order.customerName}</TableCell>
                              <TableCell>{formattedDate}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  order.status === 'Completed' ? 'default' :
                                  order.status === 'Pending' ? 'secondary' :
                                  order.status === 'Processing' ? 'default' :
                                  order.status === 'Cancelled' ? 'destructive' :
                                  'outline'
                                }>
                                  {order.status || 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(Number(order.totalAmount))}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-1">
                        <IconPackage className="size-5" />
                        Top Selling Products
                      </CardTitle>
                      <CardDescription>Products with highest sales</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/product-families">Families</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/products">All Products</Link>
                      </Button>
                    </div>
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
                              <Link 
                                href={`/products/${encodeURIComponent(product.productCode || '')}`}
                                className="font-medium hover:underline"
                              >
                                {product.productCode}
                              </Link>
                              <div className="text-sm text-muted-foreground">{product.productDescription}</div>
                            </TableCell>
                            <TableCell className="text-right">{Number(product.totalQuantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(product.totalRevenue))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              
              {/* Top Companies and Recent Product Changes Tables */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1">
                      <IconBuildingStore className="size-5" />
                      Top Companies
                    </CardTitle>
                    <CardDescription>Companies with highest order volume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Total Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCompaniesByOrders.map((company, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{company.companyName}</TableCell>
                            <TableCell className="text-muted-foreground">{company.companyDomain || '-'}</TableCell>
                            <TableCell className="text-right">{company.orderCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(company.totalSpent))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Product Updates</CardTitle>
                    <CardDescription>Latest changes to products</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentProductChanges.map((change, index) => {
                          const changeDate = change.changedAt ? new Date(change.changedAt) : null;
                          const formattedDate = changeDate ? 
                            changeDate.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'N/A';
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{change.itemName}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-48">{change.salesDescription}</div>
                              </TableCell>
                              <TableCell>{change.columnName}</TableCell>
                              <TableCell>
                                <div className="text-xs">
                                  <span className="text-muted-foreground">From:</span> {change.oldValue || 'N/A'}
                                </div>
                                <div className="text-xs">
                                  <span className="text-muted-foreground">To:</span> {change.newValue || 'N/A'}
                                </div>
                                {change.percentChange && (
                                  <Badge variant={Number(change.percentChange) > 0 ? "default" : "destructive"} className="mt-1">
                                    {Number(change.percentChange) > 0 ? '+' : ''}{change.percentChange}%
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{formattedDate}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              
              {/* Customer Types and Order Status */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Types</CardTitle>
                    <CardDescription>Distribution of customer types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {customerTypeDistribution.map((type, index) => (
                        <div key={index} className="border rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold">
                            {type.count}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{type.customerType || 'Unknown'}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Orders by Status</CardTitle>
                    <CardDescription>Current order status distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {ordersByStatus.map((status, index) => (
                        <div key={index} className="border rounded-lg p-4 text-center">
                          <div className={`text-2xl font-bold ${
                            status.status === 'Completed' ? 'text-green-600 dark:text-green-400' :
                            status.status === 'Pending' ? 'text-yellow-600 dark:text-yellow-400' :
                            status.status === 'Processing' ? 'text-blue-600 dark:text-blue-400' :
                            status.status === 'Cancelled' ? 'text-red-600 dark:text-red-400' :
                            'text-muted-foreground'
                          }`}>
                            {status.count}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{status.status || 'Unknown'}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Quick Actions */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks and navigation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/products">View All Products</Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/product-families">View Product Families</Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/orders">View All Orders</Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/companies">View All Companies</Link>
                      </Button>
                    </div>
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
