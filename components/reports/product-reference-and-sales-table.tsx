"use client"

import { DataTable } from "@/components/ui/data-table"
import { formatNumber, formatCurrency } from "@/lib/utils"
import Link from "next/link"

interface TableRow {
  product_line: string
  material_type: string
  productCode: string
  name: string | null
  description: string | null
  order_count: number
  total_units: number
  total_sales: number
}

interface ProductReferenceAndSalesTableProps {
  data: TableRow[]
}

export function ProductReferenceAndSalesTable({ data }: ProductReferenceAndSalesTableProps) {
  const columns = [
    {
      header: "Product Line",
      accessorKey: "product_line" as keyof TableRow,
      sortable: true
    },
    {
      header: "Material Type",
      accessorKey: "material_type" as keyof TableRow,
      sortable: true
    },
    {
      header: "Product Name",
      accessorKey: "name" as keyof TableRow,
      cell: (item: TableRow) => (
        <Link 
          href={`/reports/product-sales/${item.productCode}`}
          className="text-primary hover:underline whitespace-nowrap overflow-hidden text-ellipsis max-w-xs block"
        >
          {item.name || item.productCode}
        </Link>
      ),
      sortable: true
    },
    {
      header: "Description",
      accessorKey: "description" as keyof TableRow,
      cell: (item: TableRow) => (
        <div className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
          {item.description || '-'}
        </div>
      ),
      sortable: true
    },
    {
      header: "Orders",
      accessorKey: "order_count" as keyof TableRow,
      cell: (item: TableRow) => formatNumber(item.order_count),
      sortable: true
    },
    {
      header: "Total Units",
      accessorKey: "total_units" as keyof TableRow,
      cell: (item: TableRow) => formatNumber(item.total_units),
      sortable: true
    },
    {
      header: "Total Sales",
      accessorKey: "total_sales" as keyof TableRow,
      cell: (item: TableRow) => formatCurrency(item.total_sales),
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
