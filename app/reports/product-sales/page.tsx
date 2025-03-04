import { ProductLinePerformance } from "@/components/reports/product-line-performance"
import { MaterialTypeAnalysis } from "@/components/reports/material-type-analysis"
import { ProductMetricsGrid } from "@/components/reports/product-metrics-grid"
import { ProductReferenceAndSales } from "@/components/reports/product-reference-and-sales"
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
        
        {/* Performance chart and Material Type Analysis in 2 columns */}
        <div className="grid gap-6 md:grid-cols-2">
          <ProductLinePerformance 
            dateRange={date_range}
            minAmount={min_amount ? parseFloat(min_amount) : undefined}
            maxAmount={max_amount ? parseFloat(max_amount) : undefined}
            filterConsumer={filterConsumer}
          />
          <MaterialTypeAnalysis 
            dateRange={date_range}
            minAmount={min_amount ? parseFloat(min_amount) : undefined}
            maxAmount={max_amount ? parseFloat(max_amount) : undefined}
            filterConsumer={filterConsumer}
          />
        </div>

        {/* Combined Product Reference and Sales (full width) */}
        <ProductReferenceAndSales 
          dateRange={date_range}
          minAmount={min_amount ? parseFloat(min_amount) : undefined}
          maxAmount={max_amount ? parseFloat(max_amount) : undefined}
          filterConsumer={filterConsumer}
        />
      </div>
    </div>
  )
}
