"use client"

import React, { useState, useCallback, useTransition } from "react"
import { ArrowUpDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Order } from "@/lib/orders"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import debounce from "lodash/debounce"
import { fetchOrders } from "@/app/actions/data"

interface TableData {
  orders: Order[]
  totalCount: number
  recentCount: number
}

interface OrdersTableProps {
  initialOrders: TableData
}

export function OrdersTable({ initialOrders }: OrdersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [data, setData] = useState<TableData>(initialOrders)
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "")
  
  const page = Number(searchParams.get("page")) || 1
  const pageSize = 10
  const searchTerm = searchParams.get("search") || ""
  const sortColumn = (searchParams.get("sort") as keyof Order) || "orderDate"
  const sortDirection = (searchParams.get("dir") as "asc" | "desc") || "desc"

  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      })
      
      return newSearchParams.toString()
    },
    [searchParams]
  )

  const refreshData = useCallback(async () => {
    startTransition(async () => {
      try {
        const newData = await fetchOrders({
          page,
          searchTerm,
          sortColumn,
          sortDirection,
        })
        setData(newData)
      } catch (error) {
        console.error("Failed to fetch orders:", error)
      }
    })
  }, [page, searchTerm, sortColumn, sortDirection])

  React.useEffect(() => {
    refreshData()
  }, [refreshData])

  const debouncedSearch = debounce((value: string) => {
    router.replace(
      `${pathname}?${createQueryString({
        search: value || null,
        page: 1,
      })}`,
      { scroll: false }
    )
  }, 300)

  const requestSort = (column: keyof Order) => {
    const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc"
    router.replace(
      `${pathname}?${createQueryString({
        sort: column,
        dir: newDirection,
      })}`,
      { scroll: false }
    )
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
          {isPending && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
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
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.totalCount)} of {data.totalCount} orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.replace(
                `${pathname}?${createQueryString({
                  page: page - 1,
                })}`,
                { scroll: false }
              )}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.replace(
                `${pathname}?${createQueryString({
                  page: page + 1,
                })}`,
                { scroll: false }
              )}
              disabled={page * pageSize >= data.totalCount}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  )
}
