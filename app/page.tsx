import Link from "next/link";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { orders, products, orderItems, companies, customers, itemHistoryView, orderCompanyView } from "../db/schema";
import { getDateRangeFromTimeFrame } from "./utils/dates";

import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SectionCards } from "@/components/section-cards";
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
  CardFooter,
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
import { Separator } from "@/components/ui/separator";

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
    startDate,
    endDate,
    formattedStartDate,
    formattedEndDate,
    displayText
  } = getDateRangeFromTimeFrame(range, startDateParam, endDateParam);
  
  // For backward compatibility with existing queries
  const formattedLast30Days = new Date(endDate);
  formattedLast30Days.setDate(endDate.getDate() - 30);
  const formattedLast30DaysStr = formattedLast30Days.toISOString().split('T')[0];
  
  const formattedLast90Days = new Date(endDate);
  formattedLast90Days.setDate(endDate.getDate() - 90);
  const formattedLast90DaysStr = formattedLast90Days.toISOString().split('T')[0];

  // Query to get total orders and revenue within selected time frame
  const orderSummaryResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orders)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`);
  
  const totalOrders = orderSummaryResult[0]?.totalOrders || 0;
  const totalRevenue = orderSummaryResult[0]?.totalRevenue || 0;
  const avgOrderValue = orderSummaryResult[0]?.avgOrderValue || 0;

  // Query to get recent orders (last 30 days from the end date of selected range)
  const recentOrdersResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue')
  })
  .from(orders)
  .where(sql`order_date >= ${formattedLast30DaysStr}`);
  
  const recentOrdersCount = recentOrdersResult[0]?.totalOrders || 0;
  const recentRevenue = recentOrdersResult[0]?.totalRevenue || 0;

  // Query to get total products
  const totalProductsResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(products);
  
  const totalProducts = totalProductsResult[0]?.count || 0;

  // Query to get products with missing descriptions
  const missingDescriptionsResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(products)
  .where(sql`sales_description = '' OR sales_description IS NULL`);
  
  const missingDescriptions = missingDescriptionsResult[0]?.count || 0;

  // Query to get top selling products within selected time frame
  const topSellingProducts = await db.select({
    productCode: orderItems.productCode,
    productDescription: orderItems.productDescription,
    totalQuantity: sql<number>`SUM(CAST(quantity AS NUMERIC))`.as('total_quantity'),
    totalRevenue: sql<number>`SUM(line_amount)`.as('total_revenue')
  })
  .from(orderItems)
  .innerJoin(
    sql`orders`,
    sql`orders.order_number = ${orderItems.orderNumber}`
  )
  .where(sql`quantity IS NOT NULL AND CAST(quantity AS NUMERIC) > 0 AND orders.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderItems.productCode, orderItems.productDescription)
  .orderBy(sql`total_quantity DESC`)
  .limit(5);

  // Query to get recent orders list within selected time frame
  const recentOrders = await db.select({
    orderNumber: orders.orderNumber,
    customerName: orders.customerName,
    orderDate: orders.orderDate,
    totalAmount: orders.totalAmount,
    status: orders.status
  })
  .from(orders)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .orderBy(sql`order_date DESC`)
  .limit(5);

  // Query to get orders by status within selected time frame
  const ordersByStatus = await db.select({
    status: orders.status,
    count: sql<number>`count(*)`.as('count')
  })
  .from(orders)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orders.status)
  .orderBy(sql`count DESC`);
  
  // Query to get orders by month within selected time frame
  const ordersByMonth = await db.select({
    month: sql<string>`TO_CHAR(order_date, 'YYYY-MM')`.as('month'),
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orders)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(sql`month`)
  .orderBy(sql`month ASC`);
  
  // Query to get all-time orders by month for the chart (ignoring date range)
  const allTimeOrdersByMonth = await db.select({
    month: sql<string>`TO_CHAR(order_date, 'YYYY-MM')`.as('month'),
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount')
  })
  .from(orders)
  .groupBy(sql`month`)
  .orderBy(sql`month ASC`);
  
  // Query to get top companies by order count within selected time frame
  const topCompaniesByOrders = await db.select({
    companyId: orderCompanyView.companyId,
    companyName: orderCompanyView.companyName,
    companyDomain: orderCompanyView.companyDomain,
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalSpent: sql<number>`SUM(total_amount)`.as('total_spent')
  })
  .from(orderCompanyView)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderCompanyView.companyId, orderCompanyView.companyName, orderCompanyView.companyDomain)
  .orderBy(sql`order_count DESC`)
  .limit(5);
  
  // Query to get recent product changes
  const recentProductChanges = await db.select({
    itemName: itemHistoryView.itemName,
    salesDescription: itemHistoryView.salesDescription,
    columnName: itemHistoryView.columnName,
    oldValue: itemHistoryView.oldValue,
    newValue: itemHistoryView.newValue,
    changedAt: itemHistoryView.changedAt,
    percentChange: itemHistoryView.percentChange
  })
  .from(itemHistoryView)
  .orderBy(sql`changed_at DESC`)
  .limit(5);
  
  // Query to get customer types distribution
  const customerTypeDistribution = await db.select({
    customerType: customers.customerType,
    count: sql<number>`count(*)`.as('count')
  })
  .from(customers)
  .groupBy(customers.customerType)
  .orderBy(sql`count DESC`);
  
  // Query to get company match type distribution within selected time frame
  const companyMatchDistribution = await db.select({
    matchType: orderCompanyView.matchType,
    count: sql<number>`count(*)`.as('count'),
    avgConfidence: sql<number>`AVG(confidence)`.as('avg_confidence')
  })
  .from(orderCompanyView)
  .where(sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderCompanyView.matchType)
  .orderBy(sql`count DESC`);

  const dateRangeText = displayText;

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
              <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Total Orders</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {totalOrders.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <IconTrendingUp />
                        +{recentOrdersCount}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      New in last 30 days <IconTrendingUp className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                      {dateRangeText}
                    </div>
                  </CardFooter>
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      ${Number(totalRevenue).toLocaleString()}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <IconTrendingUp />
                        +${Number(recentRevenue).toLocaleString()}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      New in last 30 days <IconTrendingUp className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                      {dateRangeText}
                    </div>
                  </CardFooter>
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Total Products</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {totalProducts.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <IconTrendingDown />
                        {missingDescriptions} missing
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {missingDescriptions} products need descriptions
                    </div>
                    <div className="text-muted-foreground">
                      Improve product catalog
                    </div>
                  </CardFooter>
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Avg Order Value</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      ${Number(avgOrderValue).toLocaleString()}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <IconTrendingUp />
                        +4.5%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Trending up this month <IconTrendingUp className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                      {dateRangeText}
                    </div>
                  </CardFooter>
                </Card>
              </div>
              
              {/* Revenue Chart */}
              <div className="px-4 lg:px-6">
                <Card className="@container/card">
                  <CardHeader>
                    <CardTitle>Revenue Over Time</CardTitle>
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
                      <CardTitle>Recent Orders</CardTitle>
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
                                  order.status === 'Completed' ? 'success' :
                                  order.status === 'Pending' ? 'warning' :
                                  order.status === 'Processing' ? 'default' :
                                  order.status === 'Cancelled' ? 'destructive' :
                                  'outline'
                                }>
                                  {order.status || 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">${Number(order.totalAmount).toLocaleString()}</TableCell>
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
                      <CardTitle>Top Selling Products</CardTitle>
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
                            <TableCell className="text-right">${Number(product.totalRevenue).toLocaleString()}</TableCell>
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
                    <CardTitle>Top Companies</CardTitle>
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
                            <TableCell className="text-right">${Number(company.totalSpent).toLocaleString()}</TableCell>
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
                                  <Badge variant={Number(change.percentChange) > 0 ? "success" : "destructive"} className="mt-1">
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