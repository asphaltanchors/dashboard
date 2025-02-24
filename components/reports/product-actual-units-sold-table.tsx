"use client"

import { DataTable } from "@/components/ui/data-table"
import { formatNumber } from "@/lib/utils"

interface TableRow {
  product: string
  orders: number
  totalUnits: number
}

interface ProductActualUnitsSoldTableProps {
  data: TableRow[]
}

export function ProductActualUnitsSoldTable({ data }: ProductActualUnitsSoldTableProps) {
  const columns = [
    {
      header: "Product",
      accessorKey: "product" as keyof TableRow,
      sortable: true
    },
    {
      header: "Orders",
      accessorKey: "orders" as keyof TableRow,
      cell: (item: TableRow) => formatNumber(item.orders),
      sortable: true
    },
    {
      header: "Total Units",
      accessorKey: "totalUnits" as keyof TableRow,
      cell: (item: TableRow) => formatNumber(item.totalUnits),
      sortable: true
    }
  ]

  return <DataTable data={data} columns={columns} />
}
