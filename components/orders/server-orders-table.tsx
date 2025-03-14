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
import type { TableData, Column, FetchParams, TableOrder } from "@/types/orders"

interface ServerOrdersTableProps {
  initialOrders: TableData
  fetchOrders: (params: FetchParams) => Promise<TableData>
  preserveParams?: string[]
  title?: string
  columns?: Column[]
  defaultSort?: {
    column: keyof Order
    direction: 'asc' | 'desc'
  }
  pageSize?: number
  searchPlaceholder?: string
}

export function ServerOrdersTable({ 
  initialOrders,
  fetchOrders,
  preserveParams = [],
  title = "Orders",
  columns,
  defaultSort = { column: 'orderDate', direction: 'desc' },
  pageSize = 10,
  searchPlaceholder = "Search by order number or customer..."
}: ServerOrdersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [data, setData] = useState<TableData>(initialOrders)
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "")
  
  const page = Number(searchParams.get("page")) || 1
  const searchTerm = searchParams.get("search") || ""
  const sortColumn = (searchParams.get("sort") as keyof Order) || defaultSort.column
  const sortDirection = (searchParams.get("dir") as "asc" | "desc") || defaultSort.direction

  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      
      // Preserve specified params
      preserveParams.forEach(param => {
        const value = searchParams.get(param)
        if (value) newSearchParams.set(param, value)
      })
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      })
      
      return newSearchParams.toString()
    },
    [searchParams, preserveParams]
  )

  const refreshData = useCallback(async () => {
    startTransition(async () => {
      try {
        // Get all preserved params
        const preservedParams = Object.fromEntries(
          preserveParams.map(param => [param, searchParams.get(param)])
            .filter(([, value]) => value !== null)
        )

        const newData = await fetchOrders({
          page,
          pageSize,
          searchTerm,
          sortColumn,
          sortDirection,
          ...preservedParams
        })
        setData(newData)
      } catch (error) {
        console.error("Failed to fetch orders:", error)
      }
    })
  }, [page, pageSize, searchTerm, sortColumn, sortDirection, preserveParams, searchParams, fetchOrders])

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
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            type="text"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder={searchPlaceholder}
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
                {(columns || [
                  { key: "orderNumber", label: "Order Number" },
                  { key: "orderDate", label: "Date" },
                  { key: "customerName", label: "Customer" },
                  { key: "status", label: "Status" },
                  { key: "paymentStatus", label: "Payment Status" },
                  { key: "paymentMethod", label: "Payment Method" },
                  { key: "totalAmount", label: "Amount" },
                  { key: "margin", label: "Margin %" },
                  { key: "dueDate", label: "Due Date" }
                ]).map(({ key, label }) => (
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
                  {(columns || [
                    { key: "orderNumber", label: "Order Number", render: (value, order: TableOrder) => (
                      <Link 
                        href={`/orders/${order.quickbooksId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {value as string}
                      </Link>
                    )},
                    { key: "orderDate", label: "Date", render: (value) => 
                      new Date(value as string | number | Date).toLocaleDateString()
                    },
                    { key: "customerName", label: "Customer" },
                    { key: "status", label: "Status", render: (value) => {
                      const status = value as string
                      return (
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            status === "CLOSED"
                              ? "bg-green-100 text-green-800"
                              : status === "OPEN"
                              ? "bg-blue-100 text-blue-800"
                              : status === "VOID"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </span>
                      )
                    }},
                    { key: "paymentStatus", label: "Payment Status", render: (value) => {
                      const status = value as string
                      return (
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            status === "PAID"
                              ? "bg-green-100 text-green-800"
                              : status === "UNPAID"
                              ? "bg-red-100 text-red-800"
                              : status === "PARTIAL"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </span>
                      )
                    }},
                    { key: "paymentMethod", label: "Payment Method", render: (value) => 
                      (value as string) || "-"
                    },
                  { key: "totalAmount", label: "Amount", render: (value) => 
                    formatCurrency(value as number)
                  },
                  { key: "margin", label: "Margin %", render: (value) => 
                    value ? `${value}%` : "-"
                  },
                    { key: "dueDate", label: "Due Date", render: (value) => 
                      value ? new Date(value as Date).toLocaleDateString() : "-"
                    }
                  ]).map(({ key, render }) => (
                    <TableCell key={key}>
                      {render ? render(order[key], order) : String(order[key])}
                    </TableCell>
                  ))}
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
