"use client"

import React, { useState, useCallback, useTransition } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Product } from "@/lib/products"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import debounce from "lodash/debounce"
import { fetchProducts } from "@/app/actions/data"

interface TableData {
  products: Product[]
  totalCount: number
}

interface ProductsTableProps {
  initialProducts: TableData
}

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [data, setData] = useState<TableData>(initialProducts)
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "")
  
  const page = Number(searchParams.get("page")) || 1
  const pageSize = 10
  const searchTerm = searchParams.get("search") || ""
  const sortColumn = searchParams.get("sort") || "productCode"
  const sortDirection = (searchParams.get("dir") as "asc" | "desc") || "asc"

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
        const newData = await fetchProducts({
          page,
          searchTerm,
          sortColumn,
          sortDirection,
        })
        setData(newData)
      } catch (error) {
        console.error("Failed to fetch products:", error)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            type="text"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder="Search by product code, name, or description..."
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
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newDirection = sortColumn === "productCode" && sortDirection === "asc" ? "desc" : "asc";
                    router.replace(
                      `${pathname}?${createQueryString({
                        sort: "productCode",
                        dir: newDirection,
                      })}`,
                      { scroll: false }
                    );
                  }}
                >
                  <div className="flex items-center">
                    Product Code
                    {sortColumn === "productCode" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newDirection = sortColumn === "name" && sortDirection === "asc" ? "desc" : "asc";
                    router.replace(
                      `${pathname}?${createQueryString({
                        sort: "name",
                        dir: newDirection,
                      })}`,
                      { scroll: false }
                    );
                  }}
                >
                  <div className="flex items-center">
                    Name
                    {sortColumn === "name" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newDirection = sortColumn === "unitsPerPackage" && sortDirection === "asc" ? "desc" : "asc";
                    router.replace(
                      `${pathname}?${createQueryString({
                        sort: "unitsPerPackage",
                        dir: newDirection,
                      })}`,
                      { scroll: false }
                    );
                  }}
                >
                  <div className="flex items-center">
                    Units Per Package
                    {sortColumn === "unitsPerPackage" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newDirection = sortColumn === "cost" && sortDirection === "asc" ? "desc" : "asc";
                    router.replace(
                      `${pathname}?${createQueryString({
                        sort: "cost",
                        dir: newDirection,
                      })}`,
                      { scroll: false }
                    );
                  }}
                >
                  <div className="flex items-center">
                    Cost
                    {sortColumn === "cost" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newDirection = sortColumn === "listPrice" && sortDirection === "asc" ? "desc" : "asc";
                    router.replace(
                      `${pathname}?${createQueryString({
                        sort: "listPrice",
                        dir: newDirection,
                      })}`,
                      { scroll: false }
                    );
                  }}
                >
                  <div className="flex items-center">
                    List Price
                    {sortColumn === "listPrice" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Order Items</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newDirection = sortColumn === "createdAt" && sortDirection === "asc" ? "desc" : "asc";
                    router.replace(
                      `${pathname}?${createQueryString({
                        sort: "createdAt",
                        dir: newDirection,
                      })}`,
                      { scroll: false }
                    );
                  }}
                >
                  <div className="flex items-center">
                    Created At
                    {sortColumn === "createdAt" && (
                      sortDirection === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link 
                      href={`/reports/product-sales/${product.productCode}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {product.productCode}
                    </Link>
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>{product.unitsPerPackage}</TableCell>
                  <TableCell>
                    {product.cost ? 
                      `$${Number(product.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                      '-'}
                  </TableCell>
                  <TableCell>
                    {product.listPrice ? 
                      `$${Number(product.listPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                      '-'}
                  </TableCell>
                  <TableCell>{product._count.orderItems}</TableCell>
                  <TableCell>{new Date(product.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.products.length === 0 && (
            <p className="text-center text-gray-500 mt-4">No products found.</p>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.totalCount)} of {data.totalCount} products
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
