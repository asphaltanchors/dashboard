import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, ShoppingCart } from "lucide-react"
import { Order, Customer, CustomerEmail } from "@prisma/client"

type OrderWithCustomer = Order & {
  customer: Pick<Customer, "customerName"> & {
    emails: Pick<CustomerEmail, "email">[]
  }
}

async function getRecentOrders() {
  return await prisma.order.findMany({
    take: 10,
    orderBy: {
      orderDate: 'desc'
    },
    include: {
      customer: {
        select: {
          customerName: true,
          emails: {
            where: { isPrimary: true },
            select: { email: true },
            take: 1
          }
        }
      }
    }
  })
}

async function getOrderMetrics() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  // Current period orders
  const currentOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: thirtyDaysAgo
      }
    },
    select: {
      totalAmount: true
    }
  })

  // Previous period orders
  const previousOrders = await prisma.order.findMany({
    where: {
      orderDate: {
        gte: sixtyDaysAgo,
        lt: thirtyDaysAgo
      }
    },
    select: {
      totalAmount: true
    }
  })

  const currentTotalOrders = currentOrders.length
  const previousTotalOrders = previousOrders.length
  const orderChange = ((currentTotalOrders - previousTotalOrders) / previousTotalOrders * 100).toFixed(1)

  const currentTotalSales = currentOrders.reduce((sum: number, order) =>
    sum + Number(order.totalAmount.toString()), 0)
  const previousTotalSales = previousOrders.reduce((sum: number, order) =>
    sum + Number(order.totalAmount.toString()), 0)
  const salesChange = ((currentTotalSales - previousTotalSales) / previousTotalSales * 100).toFixed(1)

  return {
    currentTotalOrders,
    orderChange,
    currentTotalSales,
    salesChange
  }
}

export default async function Home() {
  const { currentTotalOrders, orderChange, currentTotalSales, salesChange } = await getOrderMetrics()
  const recentOrders = await getRecentOrders()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-8">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders (30d)</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentTotalOrders}</div>
                <p className={`text-xs ${Number(orderChange) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {orderChange}% from previous month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales (30d)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentTotalSales)}</div>
                <p className={`text-xs ${Number(salesChange) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {salesChange}% from previous month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order: OrderWithCustomer) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          {new Date(order.orderDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>
                          {order.customer.customerName}
                          {order.customer.emails[0] && (
                            <div className="text-xs text-muted-foreground">
                              {order.customer.emails[0].email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(Number(order.totalAmount))}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === "CLOSED"
                                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                : order.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                                : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                            }`}
                          >
                            {order.status.toLowerCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {order.sourceType === "INVOICE" ? "Invoice" : "Sales Receipt"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
