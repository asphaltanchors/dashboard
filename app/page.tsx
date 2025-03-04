import { MetricCard } from "@/components/dashboard/metric-card"
import { MonthlyRevenueChart } from "@/components/dashboard/monthly-revenue-chart"
import { AnnualRevenueChart } from "@/components/dashboard/quarterly-revenue-chart"
import { ReportHeader } from "@/components/reports/report-header"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, ShoppingCart } from "lucide-react"
import { getOrderMetrics, getMonthlyRevenue, getAnnualRevenue } from "@/lib/dashboard"

type PageProps = {
  searchParams: Promise<{
    date_range?: string
    min_amount?: string
    max_amount?: string
    filterConsumer?: string
  }>
}

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;
  const date_range = searchParams.date_range || "365d"
  const filterConsumer = searchParams.filterConsumer !== undefined
  
  const days = parseInt(date_range.replace("d", ""))
  const min_amount = searchParams.min_amount
  const max_amount = searchParams.max_amount
  // Parse filter parameters
  const filters = {
    dateRange: date_range,
    minAmount: min_amount ? parseFloat(min_amount) : undefined,
    maxAmount: max_amount ? parseFloat(max_amount) : undefined,
    filterConsumer
  }

  const [metrics, monthlyRevenue, annualRevenue] = await Promise.all([
    getOrderMetrics(filters),
    getMonthlyRevenue(filters),
    getAnnualRevenue(filters)
  ])

  const { 
    currentTotalOrders, 
    orderChange, 
    currentTotalSales, 
    salesChange
  } = metrics

  return (
    <div className="p-8">
      <ReportHeader
        dateRange={date_range}
        minAmount={min_amount ? parseFloat(min_amount) : undefined}
        maxAmount={max_amount ? parseFloat(max_amount) : undefined}
        filterConsumer={filterConsumer}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <MetricCard
          title={`Orders (${days} days)`}
          value={currentTotalOrders}
          change={orderChange}
          icon={ShoppingCart}
        />
        <MetricCard
          title={`Sales (${days} days)`}
          value={formatCurrency(currentTotalSales)}
          change={salesChange}
          icon={DollarSign}
        />
      </div>

      <div className="mt-4">
        <MonthlyRevenueChart data={monthlyRevenue} />
      </div>

      <div className="mt-4">
        <AnnualRevenueChart data={annualRevenue} />
      </div>

    </div>
  )
}
