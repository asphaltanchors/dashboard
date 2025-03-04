import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProductReferenceAndSales } from "@/lib/reports"
import { ProductReferenceAndSalesTable } from "./product-reference-and-sales-table"
import { FilterParams } from "@/lib/reports/common"

interface ProductReferenceAndSalesProps extends FilterParams {}

export async function ProductReferenceAndSales({ 
  dateRange,
  minAmount,
  maxAmount,
  filterConsumer
}: ProductReferenceAndSalesProps = {}) {
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
    total_sales: Number(item.total_sales)
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
