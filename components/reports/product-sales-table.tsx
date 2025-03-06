"use client"

import { DataTable } from "@/components/ui/data-table"
import { formatNumber, formatCurrency } from "@/lib/utils"
import Link from "next/link"

interface SalesData {
  company_name: string
  company_domain: string
  order_count: number
  total_units: number
  total_sales: number
}

interface ProductSalesTableProps {
  data: SalesData[]
}

export function ProductSalesTable({ data }: ProductSalesTableProps) {
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
      header: "Company Domain",
      accessorKey: "company_domain" as const,
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
    <DataTable 
      data={data}
      columns={columns}
      defaultSort={{
        key: "total_sales",
        direction: "desc"
      }}
    />
  )
} 