import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProductReferenceAndSales } from "@/lib/reports"
import { ProductReferenceAndSalesTable } from "./product-reference-and-sales-table"
import { FilterParams } from "@/lib/reports/common"

export async function ProductReferenceAndSales({ 
  dateRange,
  minAmount,
  maxAmount,
  filterConsumer
}: FilterParams = {}) {
  const data = await getProductReferenceAndSales({
    dateRange,
    minAmount,
    maxAmount,
    filterConsumer
  })

  // Convert string values to numbers for the table component
  const tableData = data.map(item => ({
    ...item,
    order_count: Number(item.order_count),
    total_units: Number(item.total_units),
    total_sales: Number(item.total_sales),
    total_cost: Number(item.total_cost || 0),
    profit: Number(item.profit || 0)
  }))

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Product Reference and Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <ProductReferenceAndSalesTable data={tableData} />
      </CardContent>
    </Card>
  )
}
