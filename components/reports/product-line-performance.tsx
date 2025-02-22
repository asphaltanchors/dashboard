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

interface ProductLinePerformanceProps {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

export async function ProductLinePerformance({
  dateRange,
  minAmount,
  maxAmount,
  filterConsumer
}: ProductLinePerformanceProps) {
  const days = dateRange ? parseInt(dateRange.replace("d", "")) : 365
  const metrics = await getProductLineMetrics({
    dateRange,
    minAmount,
    maxAmount,
    filterConsumer
  }) as ProductLineMetric[]

  const chartData = metrics.map(metric => ({
    product: metric.product_line,
    current: Number(metric.current_revenue),
    previous: Number(metric.previous_revenue)
  }))

  return (
    <ProductLinePerformanceChart 
      data={chartData}
      description={`Revenue Comparison - Last ${days} Days vs Previous Period`}
      dateRange={dateRange}
    />
  )
}
