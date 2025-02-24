"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductSalesMetric } from "@/types/reports"
import { formatNumber } from "@/lib/utils"

interface ProductActualUnitsSoldProps {
  data: ProductSalesMetric[]
}

export function ProductActualUnitsSold({ data }: ProductActualUnitsSoldProps) {
  // Group data by product line for subtotals
  const productLines = data.reduce((acc, curr) => {
    if (!acc[curr.product_line]) {
      acc[curr.product_line] = {
        total_units: 0,
        materials: []
      }
    }
    
    acc[curr.product_line].materials.push(curr)
    acc[curr.product_line].total_units += Number(curr.total_units)
    
    return acc
  }, {} as Record<string, {
    total_units: number
    materials: ProductSalesMetric[]
  }>)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Actual Units Sold</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Line</TableHead>
              <TableHead>Material Type</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(productLines).flatMap(data => 
              data.materials.map(metric => (
                <TableRow key={`${metric.product_line}-${metric.material_type}`}>
                    <TableCell>{metric.product_line}</TableCell>
                  <TableCell>{metric.material_type}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(metric.order_count))}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(metric.total_units))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
