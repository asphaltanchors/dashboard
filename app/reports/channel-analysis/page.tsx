import SalesChannelInsights from "@/components/reports/sales-channel-insights"
import { getSalesChannelMetrics } from "@/lib/reports"
import { SalesChannelMetric } from "@/types/reports"

export default async function ChannelAnalysisPage() {
  const metrics = await getSalesChannelMetrics() as SalesChannelMetric[]
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Channel Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Compare revenue, units sold, and order metrics across all sales channels</p>
      </div>
      
      <div className="grid gap-8">
        <SalesChannelInsights metrics={metrics} />
      </div>
    </div>
  )
}
