import { db } from "@/db"
import { sql } from "drizzle-orm"
import { orders, orderCompanyView } from "@/db/schema"
import { desc } from "drizzle-orm"
import { getDateRangeFromTimeFrame } from "@/app/utils/dates"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function OrdersPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  // Handle search params safely
  const range = searchParams && searchParams.range 
    ? Array.isArray(searchParams.range) 
      ? searchParams.range[0] 
      : searchParams.range
    : "last-12-months"
  
  // Calculate date range based on the selected time frame
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate } = dateRange
  
  // Query to get total number of orders and revenue for the selected time frame
  const orderSummaryResultPromise = db
    .select({
      totalOrders: sql<number>`count(*)`.as("total_orders"),
      totalRevenue: sql<number>`SUM(total_amount)`.as("total_revenue"),
      avgOrderValue: sql<number>`AVG(total_amount)`.as("avg_order_value"),
    })
    .from(orders)
    .where(
      sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
  
  // Query to get orders by status
  const ordersByStatusPromise = db
    .select({
      status: orders.status,
      count: sql<number>`count(*)`.as("count"),
      totalAmount: sql<number>`SUM(total_amount)`.as("total_amount"),
    })
    .from(orders)
    .where(
      sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
    .groupBy(orders.status)
    .orderBy(sql`count DESC`)

  // Query to get orders by payment method
  const ordersByPaymentMethodPromise = db
    .select({
      paymentMethod: orders.paymentMethod,
      count: sql<number>`count(*)`.as("count"),
      totalAmount: sql<number>`SUM(total_amount)`.as("total_amount"),
    })
    .from(orders)
    .where(
      sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
    .groupBy(orders.paymentMethod)
    .orderBy(sql`count DESC`)

  // Query to get most recent orders list with company information
  const recentOrdersListPromise = db
    .select({
      orderNumber: orderCompanyView.orderNumber,
      customerName: orderCompanyView.customerName,
      orderDate: orderCompanyView.orderDate,
      totalAmount: orderCompanyView.totalAmount,
      companyName: orderCompanyView.companyName,
      companyDomain: orderCompanyView.companyDomain,
      matchType: orderCompanyView.matchType,
      confidence: orderCompanyView.confidence,
    })
    .from(orderCompanyView)
    .where(
      sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
    .orderBy(desc(orderCompanyView.orderDate))
    .limit(25)

  // Helper function to join all data fetching promises and render UI
  async function OrdersPageContent() {
    // Wait for all data to be fetched in parallel
    const [orderSummaryResult, ordersByStatus, ordersByPaymentMethod, recentOrdersList] = await Promise.all([
      orderSummaryResultPromise,
      ordersByStatusPromise,
      ordersByPaymentMethodPromise,
      recentOrdersListPromise
    ])

    const totalOrders = orderSummaryResult[0]?.totalOrders || 0
    const totalRevenue = orderSummaryResult[0]?.totalRevenue || 0
    const avgOrderValue = orderSummaryResult[0]?.avgOrderValue || 0

    // Match type badge variant mapping
    const getMatchTypeVariant = (matchType: string | null) => {
      switch (matchType) {
        case "exact":
          return "success"
        case "fuzzy":
          return "warning"
        case "manual":
          return "info"
        default:
          return "secondary"
      }
    }

    // Fetch status information directly from orders table for each order
    const orderStatusPromises = recentOrdersList.map(order => 
      db.select({ status: orders.status })
        .from(orders)
        .where(sql`${orders.orderNumber} = ${order.orderNumber}`)
        .limit(1)
    )
    
    // Wait for all status queries to complete
    const orderStatuses = await Promise.all(orderStatusPromises)
    
    // Add status information to each order in the list
    const ordersWithStatus = recentOrdersList.map((order, index) => ({
      ...order,
      status: orderStatuses[index][0]?.status || null
    }))

    // Status badge variant mapping
    const getStatusVariant = (status: string | null) => {
      switch (status) {
        case "Paid":
          return "success"
        case "Pending":
          return "warning"
        default:
          return "secondary"
      }
    }

    return (
      <>
        <div className="flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          <h2 className="text-lg font-medium">
            {dateRange.displayText}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalOrders.toLocaleString()}
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
                ${Number(totalRevenue).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Average Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${Number(avgOrderValue).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersByStatus.map((status, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {status.status || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          {status.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(status.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {((status.count / totalOrders) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {ordersByStatus.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
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
              <CardTitle>Orders by Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersByPaymentMethod.map((method, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {method.paymentMethod || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          {method.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(method.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {((method.count / totalOrders) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {ordersByPaymentMethod.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
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

        <Card className="mx-6">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersWithStatus.map((order, index) => {
                    // Format the date
                    const orderDate = order.orderDate
                      ? new Date(order.orderDate)
                      : null
                    const formattedDate = orderDate
                      ? orderDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/orders/${encodeURIComponent(
                              order.orderNumber
                            )}?range=${range}`}
                            className="text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {order.companyName || "—"}
                          </div>
                          {order.companyDomain && (
                            <div className="text-xs text-muted-foreground">
                              {order.companyDomain}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status)}>
                            {order.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.matchType && (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={getMatchTypeVariant(order.matchType)}
                                className="text-xs"
                              >
                                {order.matchType}
                              </Badge>
                              {order.confidence && (
                                <span className="text-xs text-muted-foreground">
                                  {(order.confidence * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(order.totalAmount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {ordersWithStatus.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
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
              {/* @ts-expect-error - OrdersPageContent is an async component */}
              <OrdersPageContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}