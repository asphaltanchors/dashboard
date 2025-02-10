import { getProductLineMetrics } from "@/lib/reports"
import { ProductLinePerformanceChart } from "./product-line-performance-chart"

interface ProductLineMetric {
  product_line: string
  order_count: string
  total_units: string
  total_revenue: string
}

export async function ProductLinePerformance() {
  const metrics = await getProductLineMetrics() as ProductLineMetric[]
  
  // Sort by revenue and take top 5
  const sortedMetrics = [...metrics]
    .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
    .slice(0, 5)

  const chartData = sortedMetrics.map(metric => ({
    product: metric.product_line,
    current: Number(metric.total_revenue),
    previous: Number(metric.total_revenue) * 0.85 // Simulated previous period data
  }))

  return <ProductLinePerformanceChart data={chartData} />
}
