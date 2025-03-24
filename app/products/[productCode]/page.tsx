import { db } from "@/db"
import { sql } from "drizzle-orm"
import { orderItems, orders } from "@/db/schema"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDateRangeFromTimeFrame } from "@/app/utils/dates"

export default async function ProductDashboard({
  params,
  searchParams,
}: {
  params: { productCode: string }
  searchParams: { range?: string }
}) {
  const productCode = params.productCode
  const range = searchParams.range || "last-12-months"
  
  // Get date range based on the range parameter
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate } = dateRange

  // Query to get product details with date range filter
  const productDetailsResult = await db
    .select({
      productCode: orderItems.productCode,
      productDescription: orderItems.productDescription,
      totalQuantity: sql<number>`SUM(CAST(quantity AS NUMERIC))`.as("total_quantity"),
      totalRevenue: sql<number>`SUM(line_amount)`.as("total_revenue"),
      avgUnitPrice: sql<number>`AVG(unit_price)`.as("avg_unit_price"),
      orderCount: sql<number>`COUNT(DISTINCT order_number)`.as("order_count"),
    })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.orderNumber} = ${orderItems.orderNumber}`)
    .where(
      sql`${orderItems.productCode} = ${productCode} AND 
          ${orders.orderDate} >= ${formattedStartDate} AND 
          ${orders.orderDate} <= ${formattedEndDate}`
    )
    .groupBy(orderItems.productCode, orderItems.productDescription)

  const productDetails = productDetailsResult[0] || {
    productCode,
    productDescription: "Unknown Product",
    totalQuantity: 0,
    totalRevenue: 0,
    avgUnitPrice: 0,
    orderCount: 0,
  }

  // Define type for monthly sales data
  type MonthlySales = {
    month: string
    total_quantity: number
    total_revenue: number
    order_count: number
  }

  // Query to get sales by month for this product with date range filter
  const salesByMonthResult = await db.execute(sql`
    SELECT 
      TO_CHAR(o.order_date, 'YYYY-MM') as month,
      SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity,
      SUM(oi.line_amount) as total_revenue,
      COUNT(DISTINCT o.order_number) as order_count
    FROM order_items oi
    INNER JOIN orders o ON o.order_number = oi.order_number
    WHERE oi.product_code = ${productCode}
    AND o.order_date >= ${formattedStartDate}
    AND o.order_date <= ${formattedEndDate}
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `)

  // Cast the result to our type
  const salesByMonth = salesByMonthResult as unknown as MonthlySales[]

  // Query to get recent orders for this product with date range filter
  const recentOrders = await db
    .select({
      orderNumber: orderItems.orderNumber,
      orderDate: orders.orderDate,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      lineAmount: orderItems.lineAmount,
      customerName: orders.customerName,
    })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.orderNumber} = ${orderItems.orderNumber}`)
    .where(
      sql`${orderItems.productCode} = ${productCode} AND 
          ${orders.orderDate} >= ${formattedStartDate} AND 
          ${orders.orderDate} <= ${formattedEndDate}`
    )
    .orderBy(sql`${orders.orderDate} DESC`)
    .limit(10)

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
              <div className="flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/products?range=${range}`}
                      className="flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                      Back to Products
                    </Link>
                  </Button>
                </div>
                <h2 className="text-lg font-medium">
                  {dateRange.displayText}
                </h2>
              </div>

              <div className="px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Product Code
                        </p>
                        <p className="text-lg font-medium">
                          {productDetails.productCode}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Description
                        </p>
                        <p className="text-lg font-medium">
                          {productDetails.productDescription}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Average Unit Price
                        </p>
                        <p className="text-lg font-medium">
                          $
                          {Number(productDetails.avgUnitPrice).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Orders
                        </p>
                        <p className="text-lg font-medium">
                          {Number(productDetails.orderCount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Quantity Sold
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {Number(productDetails.totalQuantity).toLocaleString()}
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
                      ${Number(productDetails.totalRevenue).toLocaleString()}
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
                      $
                      {productDetails.orderCount > 0
                        ? Number(
                            productDetails.totalRevenue / productDetails.orderCount
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Sales Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesByMonth.map((month, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {month.month}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(month.total_quantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ${Number(month.total_revenue).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {month.order_count}
                              </TableCell>
                            </TableRow>
                          ))}
                          {salesByMonth.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-4 text-center text-muted-foreground"
                              >
                                No monthly sales data available
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
                    <CardTitle>Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOrders.map((order, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <Link 
                                  href={`/orders/${order.orderNumber}?range=${range}`}
                                  className="text-primary hover:underline"
                                >
                                  {order.orderNumber}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {order.orderDate
                                  ? new Date(order.orderDate).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{order.customerName}</TableCell>
                              <TableCell className="text-right">
                                {Number(order.quantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ${Number(order.lineAmount).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {recentOrders.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="py-4 text-center text-muted-foreground"
                              >
                                No recent orders
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}