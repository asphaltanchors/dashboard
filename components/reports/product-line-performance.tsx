import { getProductLineMetrics } from "@/lib/reports"
import { ProductLinePerformanceChart } from "./product-line-performance-chart"

interface ProductLineMetric {
  product_line: string
  current_revenue: string
  previous_revenue: string
  products: Array<{
    productCode: string
    name: string
    description: string | null
  }>
}

export async function ProductLinePerformance() {
  const metrics = await getProductLineMetrics() as ProductLineMetric[]

  const chartData = metrics.map(metric => ({
    product: metric.product_line,
    current: Number(metric.current_revenue),
    previous: Number(metric.previous_revenue)
  }))

  return <ProductLinePerformanceChart data={chartData} />
}
