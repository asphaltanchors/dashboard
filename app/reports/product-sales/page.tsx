import { ProductLinePerformance } from "@/components/reports/product-line-performance"
import { MaterialTypeAnalysis } from "@/components/reports/material-type-analysis"
import { SalesChannelInsights } from "@/components/reports/sales-channel-insights"
import { ProductMetricsGrid } from "@/components/reports/product-metrics-grid"
import { ProductLineReferenceContainer } from "@/components/reports/product-line-reference-container"

export default async function ProductSalesPage() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Product Sales Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Last 12 months of sales data</p>
      </div>
      
      <div className="grid gap-8">
        {/* Key metrics at the top */}
        <ProductMetricsGrid />
        
        {/* All visualizations in 2 columns */}
        <div className="grid gap-6 md:grid-cols-2">
          <ProductLinePerformance />
          <MaterialTypeAnalysis />
          <SalesChannelInsights />
          <ProductLineReferenceContainer />
        </div>
      </div>
    </div>
  )
}
