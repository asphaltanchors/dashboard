import SalesChannelTable from "@/components/reports/sales-channel-table"
import { ReportHeader } from "@/components/reports/report-header"
import { getSalesChannelMetrics } from "@/lib/reports"
import { SalesChannelMetric } from "@/types/reports"

type PageProps = {
  searchParams: Promise<{
    date_range?: string
    min_amount?: string
    max_amount?: string
    filterConsumer?: string
  }>
}

export default async function ChannelAnalysisPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const date_range = searchParams.date_range || "365d"
  const filterConsumer = searchParams.filterConsumer !== undefined
  const min_amount = searchParams.min_amount
  const max_amount = searchParams.max_amount

  const filters = {
    dateRange: date_range,
    minAmount: min_amount ? parseFloat(min_amount) : undefined,
    maxAmount: max_amount ? parseFloat(max_amount) : undefined,
    filterConsumer
  }

  const metrics = await getSalesChannelMetrics(filters) as SalesChannelMetric[]

  return (
    <div className="p-8">
      <ReportHeader
        title="Channel Analysis"
        dateRange={date_range}
        minAmount={min_amount ? parseFloat(min_amount) : undefined}
        maxAmount={max_amount ? parseFloat(max_amount) : undefined}
        filterConsumer={filterConsumer}
        resetPath="/reports/channel-analysis?date_range=365d"
      />
      
      <div className="mt-8">
        <SalesChannelTable metrics={metrics} />
      </div>
    </div>
  )
}
