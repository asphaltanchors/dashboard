"use client"

import React, { useState, useCallback, useTransition } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Company } from "@/lib/companies"
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import debounce from "lodash/debounce"
import { fetchCompanies } from "@/app/actions/data"

interface TableData {
  companies: Company[]
  totalCount: number
  recentCount: number
}

interface CompaniesTableProps {
  initialCompanies: TableData
}

export function CompaniesTable({ initialCompanies }: CompaniesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [data, setData] = useState<TableData>(initialCompanies)
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "")
  const [filterConsumer, setFilterConsumer] = useState(searchParams.get("filterConsumer") !== "false")
  
  const page = Number(searchParams.get("page")) || 1
  const pageSize = 10
  const searchTerm = searchParams.get("search") || ""
  const sortColumn = searchParams.get("sort") || "domain"
  const sortDirection = searchParams.get("dir") === "desc" ? "desc" : "asc"

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
        const newData = await fetchCompanies({
          page,
          searchTerm,
          sortColumn,
          sortDirection,
          filterConsumer,
        })
        setData(newData)
      } catch (error) {
        console.error("Failed to fetch companies:", error)
      }
    })
  }, [page, searchTerm, sortColumn, sortDirection, filterConsumer])

  React.useEffect(() => {
    refreshData()
  }, [refreshData])

  const requestSort = (column: string) => {
    const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc"
    router.replace(
      `${pathname}?${createQueryString({
        sort: column,
        dir: newDirection,
      })}`,
      { scroll: false }
    )
  }

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
        <CardTitle>Companies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex gap-4 items-center">
            <Input
              type="text"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              placeholder="Search by name or domain..."
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value)
                debouncedSearch(e.target.value)
              }}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newValue = !filterConsumer
                setFilterConsumer(newValue)
                router.replace(
                  `${pathname}?${createQueryString({
                    filterConsumer: newValue ? null : "false",
                    page: 1,
                  })}`,
                  { scroll: false }
                )
              }}
              className={filterConsumer ? "bg-blue-50" : ""}
            >
              {filterConsumer ? "Hiding" : "Show"} Consumer Domains
            </Button>
          </div>
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
                { key: "name", label: "Name", sortable: true },
                { key: "domain", label: "Domain", sortable: true },
                { key: "totalOrders", label: "Total Orders", sortable: true },
                { key: "customerCount", label: "Customers", sortable: true },
                { key: "enriched", label: "Enrichment Status", sortable: true },
                { key: "enrichedAt", label: "Last Enriched", sortable: true },
                { key: "enrichedSource", label: "Source", sortable: false }
              ].map(({ key, label, sortable }) => (
                <TableHead key={key}>
                  {sortable ? (
                    <Button 
                      variant="ghost" 
                      onClick={() => requestSort(key)}
                      className="h-8 p-0 font-semibold"
                    >
                      {label}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="font-semibold">{label}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Link 
                    href={`/companies/${company.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell>{company.domain}</TableCell>
                <TableCell>${company.totalOrders.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>{company.customerCount}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      company.enriched
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {company.enriched ? "Enriched" : "Pending"}
                  </span>
                </TableCell>
                <TableCell>
                  {company.enrichedAt ? new Date(company.enrichedAt).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>{company.enrichedSource || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.companies.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No companies found.</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.totalCount)} of {data.totalCount} companies
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
