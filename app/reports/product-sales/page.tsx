import { ProductLinePerformance } from "@/components/reports/product-line-performance"
import { ProductActualUnitsSold } from "@/components/reports/product-actual-units-sold"
import { MaterialTypeAnalysis } from "@/components/reports/material-type-analysis"
import { ProductMetricsGrid } from "@/components/reports/product-metrics-grid"
import { ProductLineReferenceContainer } from "@/components/reports/product-line-reference-container"
import { ReportHeader } from "@/components/reports/report-header"

type PageProps = {
  searchParams: Promise<{
    date_range?: string
    min_amount?: string
    max_amount?: string
    filterConsumer?: string
  }>
}

export default async function ProductSalesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const date_range = searchParams.date_range || "365d"
  const filterConsumer = searchParams.filterConsumer !== undefined
  const min_amount = searchParams.min_amount
  const max_amount = searchParams.max_amount

  return (
    <div className="space-y-6 p-8">
      <ReportHeader
        title="Product Sales Analysis"
        resetPath="/reports/product-sales?date_range=365d"
        dateRange={date_range}
        minAmount={min_amount ? parseFloat(min_amount) : undefined}
        maxAmount={max_amount ? parseFloat(max_amount) : undefined}
        filterConsumer={filterConsumer}
      />
      
      <div className="grid gap-8">
        {/* Key metrics at the top */}
        <ProductMetricsGrid 
          dateRange={date_range}
          minAmount={min_amount ? parseFloat(min_amount) : undefined}
          maxAmount={max_amount ? parseFloat(max_amount) : undefined}
          filterConsumer={filterConsumer}
        />
        
        {/* Performance charts in 2 columns */}
        <div className="grid gap-6 md:grid-cols-2">
          <ProductLinePerformance 
            dateRange={date_range}
            minAmount={min_amount ? parseFloat(min_amount) : undefined}
            maxAmount={max_amount ? parseFloat(max_amount) : undefined}
            filterConsumer={filterConsumer}
          />
          <ProductActualUnitsSold 
            dateRange={date_range}
            minAmount={min_amount ? parseFloat(min_amount) : undefined}
            maxAmount={max_amount ? parseFloat(max_amount) : undefined}
            filterConsumer={filterConsumer}
          />
        </div>

        {/* Material Type Analysis and Product Line Reference in 2 columns */}
        <div className="grid gap-6 md:grid-cols-2">
          <MaterialTypeAnalysis 
            dateRange={date_range}
            minAmount={min_amount ? parseFloat(min_amount) : undefined}
            maxAmount={max_amount ? parseFloat(max_amount) : undefined}
            filterConsumer={filterConsumer}
          />
          <ProductLineReferenceContainer 
            dateRange={date_range}
            minAmount={min_amount ? parseFloat(min_amount) : undefined}
            maxAmount={max_amount ? parseFloat(max_amount) : undefined}
            filterConsumer={filterConsumer}
          />
        </div>
      </div>
    </div>
  )
}
