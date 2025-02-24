import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActualUnitsSold } from "@/lib/reports"
import { ProductActualUnitsSoldTable } from "./product-actual-units-sold-table"

interface ProductActualUnitsSoldProps {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

export async function ProductActualUnitsSold({ 
  dateRange,
  minAmount,
  maxAmount,
  filterConsumer
}: ProductActualUnitsSoldProps) {
  const data = await getActualUnitsSold({
    dateRange,
    minAmount,
    maxAmount,
    filterConsumer
  })

  const tableData = data.map(metric => ({
    product: `${metric.product_line} - ${metric.material_type}`,
    orders: Number(metric.order_count),
    totalUnits: Number(metric.total_units)
  }))

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Actual Units Sold</CardTitle>
      </CardHeader>
      <CardContent>
        <ProductActualUnitsSoldTable data={tableData} />
      </CardContent>
    </Card>
  )
}
