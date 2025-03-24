import { db } from "@/db"
import { sql } from "drizzle-orm"
import { orders, orderItems, orderCompanyView } from "@/db/schema"
import { notFound } from "next/navigation"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string }
  searchParams: { range?: string }
}) {
  const { orderNumber } = params
  const range = searchParams.range || "last-12-months"

  // Fetch the order details
  const orderDetails = await db
    .select()
    .from(orders)
    .where(sql`${orders.orderNumber} = ${orderNumber}`)
    .limit(1)

  // If order not found, return 404
  if (orderDetails.length === 0) {
    notFound()
  }

  const order = orderDetails[0]

  // Fetch the order items
  const items = await db
    .select()
    .from(orderItems)
    .where(sql`${orderItems.orderNumber} = ${orderNumber}`)

  // Fetch company information if available
  const companyInfo = await db
    .select()
    .from(orderCompanyView)
    .where(sql`${orderCompanyView.orderNumber} = ${orderNumber}`)
    .limit(1)

  // Calculate order summary
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.lineAmount || 0),
    0
  )

  // Shipping items
  const shippingItems = items.filter((item) => item.productCode === "Shipping")
  const shippingTotal = shippingItems.reduce(
    (sum, item) => sum + Number(item.lineAmount || 0),
    0
  )

  // Tax calculation (assuming tax is the difference between total and subtotal+shipping)
  const taxAmount = Number(order.totalAmount) - subtotal - shippingTotal

  // Format the order date
  const orderDate = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown"

  // Check if there's company information
  const hasCompanyInfo = companyInfo.length > 0
  const company = hasCompanyInfo ? companyInfo[0] : null

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

  // Match type badge variant mapping
  const getMatchTypeVariant = (matchType: string) => {
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
                      href={`/orders?range=${range}`}
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
                      Back to Orders
                    </Link>
                  </Button>
                </div>
                <Badge variant={getStatusVariant(order.status)}>
                  {order.status || "Unknown"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-3">
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle>Order Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Order Number
                        </p>
                        <p className="font-medium">{orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Order Date
                        </p>
                        <p className="font-medium">{orderDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Order Type
                        </p>
                        <p className="font-medium">{order.orderType || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Payment Method
                        </p>
                        <p className="font-medium">
                          {order.paymentMethod || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          PO Number
                        </p>
                        <p className="font-medium">{order.poNumber || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Terms</p>
                        <p className="font-medium">{order.terms || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Class</p>
                        <p className="font-medium">{order.class || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-medium">{order.status || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">
                          ${subtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium">
                          ${shippingTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium">
                          ${taxAmount.toLocaleString()}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-xl">
                          ${Number(order.totalAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      <span className="text-muted-foreground">
                        Customer Name:
                      </span>{" "}
                      {order.customerName}
                    </p>

                    {hasCompanyInfo && (
                      <>
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">
                            Company
                          </p>
                          <p className="font-medium">{company?.companyName}</p>
                          {company?.companyDomain && (
                            <p className="text-sm text-muted-foreground">
                              {company.companyDomain}
                            </p>
                          )}
                        </div>

                        {company?.matchType && (
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">
                              Match Details
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge
                                variant={getMatchTypeVariant(company.matchType)}
                              >
                                {company.matchType}
                              </Badge>
                              {company.confidence && (
                                <span className="text-xs text-muted-foreground">
                                  {(company.confidence * 100).toFixed(1)}%
                                  confidence
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Address Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="mb-2 font-medium">Billing Address</h3>
                        <p>{order.billingAddressLine1 || "N/A"}</p>
                        {order.billingAddressLine2 && (
                          <p>{order.billingAddressLine2}</p>
                        )}
                      </div>

                      <div>
                        <h3 className="mb-2 font-medium">Shipping Address</h3>
                        <p>{order.shippingAddressLine1 || "N/A"}</p>
                        {order.shippingAddressLine2 && (
                          <p>{order.shippingAddressLine2}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mx-6">
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right">
                            Line Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">
                                {item.productCode === "Shipping" ? (
                                  "Shipping"
                                ) : (
                                  <Link
                                    href={`/products/${encodeURIComponent(
                                      item.productCode
                                    )}?range=${range}`}
                                    className="text-primary hover:underline"
                                  >
                                    {item.productCode}
                                  </Link>
                                )}
                              </div>
                              {item.productDescription && (
                                <div className="text-sm text-muted-foreground">
                                  {item.productDescription}
                                </div>
                              )}
                              {item.productClass && (
                                <div className="text-xs text-muted-foreground">
                                  Class: {item.productClass}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.quantity
                                ? Number(item.quantity).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              $
                              {Number(item.unitPrice || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              $
                              {Number(item.lineAmount || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {items.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-muted-foreground"
                            >
                              No items found for this order
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
      </SidebarInset>
    </SidebarProvider>
  )
}