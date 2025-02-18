"use client"

import React, { useState } from "react"
import { ArrowUpDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Order } from "@/lib/orders"
import Link from "next/link"
import debounce from "lodash/debounce"

interface TableData {
  orders: Order[]
  totalCount: number
  recentCount: number
}

interface StaticOrdersTableProps {
  initialOrders: TableData
}

export function StaticOrdersTable({ initialOrders }: StaticOrdersTableProps) {
  // Helper function to sort orders
  const sortOrders = (orders: Order[], column: keyof Order, direction: "asc" | "desc") => {
    return [...orders].sort((a, b) => {
      const aValue = a[column]
      const bValue = b[column]
      if (aValue === null) return direction === "asc" ? 1 : -1
      if (bValue === null) return direction === "asc" ? -1 : 1
      if (aValue < bValue) return direction === "asc" ? -1 : 1
      if (aValue > bValue) return direction === "asc" ? 1 : -1
      return 0
    })
  }

  // Initialize with sorted data
  const [data, setData] = useState<TableData>({
    ...initialOrders,
    orders: sortOrders(initialOrders.orders, "orderDate", "desc")
  })
  const [searchValue, setSearchValue] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    column: keyof Order
    direction: "asc" | "desc"
  }>({
    column: "orderDate",
    direction: "desc"
  })

  const debouncedSearch = debounce((value: string) => {
    const searchTerm = value.toLowerCase()
    const filtered = initialOrders.orders.filter(order => 
      order.orderNumber.toLowerCase().includes(searchTerm) ||
      order.customerName.toLowerCase().includes(searchTerm)
    )
    setData({
      ...initialOrders,
      orders: sortOrders(filtered, sortConfig.column, sortConfig.direction)
    })
  }, 300)

  const requestSort = (column: keyof Order) => {
    const newDirection = 
      sortConfig.column === column && sortConfig.direction === "asc" 
        ? "desc" 
        : "asc"
    
    setSortConfig({ column, direction: newDirection })
    
    const sorted = sortOrders(data.orders, column, newDirection)

    setData({
      ...data,
      orders: sorted
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by order number or customer..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value)
              debouncedSearch(e.target.value)
            }}
          />
        </div>
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { key: "orderNumber", label: "Order Number" },
                  { key: "orderDate", label: "Date" },
                  { key: "customerName", label: "Customer" },
                  { key: "status", label: "Status" },
                  { key: "paymentStatus", label: "Payment Status" },
                  { key: "paymentMethod", label: "Payment Method" },
                  { key: "totalAmount", label: "Amount" },
                  { key: "dueDate", label: "Due Date" }
                ].map(({ key, label }) => (
                  <TableHead key={key}>
                    <Button 
                      variant="ghost" 
                      onClick={() => requestSort(key as keyof Order)}
                      className="h-8 p-0 font-semibold"
                    >
                      {label}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link 
                      href={`/orders/${order.quickbooksId}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === "CLOSED"
                          ? "bg-green-100 text-green-800"
                          : order.status === "OPEN"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "VOID"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        order.paymentStatus === "PAID"
                          ? "bg-green-100 text-green-800"
                          : order.paymentStatus === "UNPAID"
                          ? "bg-red-100 text-red-800"
                          : order.paymentStatus === "PARTIAL"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.paymentStatus.charAt(0) + order.paymentStatus.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell>{order.paymentMethod || "-"}</TableCell>
                  <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                  <TableCell>{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.orders.length === 0 && (
            <p className="text-center text-gray-500 mt-4">No orders found.</p>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {data.orders.length} of {initialOrders.totalCount} orders
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
