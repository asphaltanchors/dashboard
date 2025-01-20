import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { OrderWithCustomer } from "@/types/orders"

interface RecentOrdersProps {
  orders: OrderWithCustomer[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
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
            {orders.map((order) => (
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
  )
}
