"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { ProductSalesMetric } from "@/types/reports"
import { formatNumber } from "@/lib/utils"

interface ProductActualUnitsSoldProps {
  data: ProductSalesMetric[]
}

interface TableRow {
  product: string
  orders: number
  totalUnits: number
}

export function ProductActualUnitsSold({ data }: ProductActualUnitsSoldProps) {
  // Transform data into format expected by DataTable
  const tableData: TableRow[] = data.map(metric => ({
    product: `${metric.product_line} - ${metric.material_type}`,
    orders: Number(metric.order_count),
    totalUnits: Number(metric.total_units)
  }))

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Actual Units Sold</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable data={tableData} columns={columns} />
      </CardContent>
    </Card>
  )
}
