import { getProductLineMetrics } from "@/lib/reports"
import { ProductLineReference } from "./product-line-reference"

export async function ProductLineReferenceContainer() {
  const metrics = await getProductLineMetrics()
  
  // Sort by revenue and take top 5 to match chart
  const sortedMetrics = [...metrics]
    .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
    .slice(0, 5)

  const referenceData = sortedMetrics.map(metric => ({
    product_line: metric.product_line,
    products: metric.products
  }))

  return <ProductLineReference data={referenceData} />
}
