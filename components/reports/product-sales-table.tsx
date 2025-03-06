"use client"

import { DataTable } from "@/components/ui/data-table"
import { formatNumber, formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useMemo } from "react"

interface SalesData {
  company_name: string
  company_domain: string
  order_count: number
  total_units: number
  total_sales: number
  sales_class: string
}

interface ProductSalesTableProps {
  data: SalesData[]
}

export function ProductSalesTable({ data }: ProductSalesTableProps) {
  const [selectedClass, setSelectedClass] = useState<string>("all")

  // Get unique sales classes
  const salesClasses = useMemo(() => {
    const classes = Array.from(new Set(data.map(item => item.sales_class)))
    return ["all", ...classes.sort()]
  }, [data])

  // Filter data based on selected class
  const filteredData = useMemo(() => {
    if (selectedClass === "all") return data
    return data.filter(item => item.sales_class === selectedClass)
  }, [data, selectedClass])

  const columns = [
    {
      header: "Company Name",
      accessorKey: "company_name" as const,
      cell: (item: SalesData) => (
        <Link 
          href={`/companies/${item.company_domain}`}
          className="text-primary hover:underline"
        >
          {item.company_name || item.company_domain}
        </Link>
      ),
      sortable: true
    },
    {
      header: "Sales Class",
      accessorKey: "sales_class" as const,
      cell: (item: SalesData) => (
        <span className="whitespace-nowrap">{item.sales_class}</span>
      ),
      sortable: true
    },
    {
      header: "Orders",
      accessorKey: "order_count" as const,
      cell: (item: SalesData) => formatNumber(item.order_count),
      sortable: true
    },
    {
      header: "Total Units",
      accessorKey: "total_units" as const,
      cell: (item: SalesData) => formatNumber(item.total_units),
      sortable: true
    },
    {
      header: "Total Sales",
      accessorKey: "total_sales" as const,
      cell: (item: SalesData) => formatCurrency(item.total_sales),
      sortable: true
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by class:</span>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {salesClasses.map(className => (
                <SelectItem key={className} value={className}>
                  {className === "all" ? "All Classes" : className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable 
        data={filteredData}
        columns={columns}
        defaultSort={{
          key: "total_sales",
          direction: "desc"
        }}
      />
    </div>
  )
} 