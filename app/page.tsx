import { MetricCard } from "@/components/dashboard/metric-card"
import { PaymentMethodCard } from "@/components/dashboard/payment-method-card"
import { ClassCard } from "@/components/dashboard/class-card"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { ReportHeader } from "@/components/reports/report-header"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, ShoppingCart } from "lucide-react"
import { getOrderMetrics, getPaymentMethodMetrics, getClassMetrics, getRecentOrders } from "@/lib/dashboard"

interface PageProps {
  searchParams: Promise<{
    date_range?: string
    min_amount?: string
    max_amount?: string
  }>
}

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;
  const date_range = searchParams.date_range || "365d"
  
  const days = parseInt(date_range.replace("d", ""))
  const min_amount = searchParams.min_amount
  const max_amount = searchParams.max_amount

  // Parse filter parameters
  const filters = {
    dateRange: date_range,
    minAmount: min_amount ? parseFloat(min_amount) : undefined,
    maxAmount: max_amount ? parseFloat(max_amount) : undefined
  }

  const [metrics, paymentMetrics, classMetrics, recentOrders] = await Promise.all([
    getOrderMetrics(filters),
    getPaymentMethodMetrics(filters),
    getClassMetrics(filters),
    getRecentOrders(filters)
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
      />

      <div className="grid gap-4 md:grid-cols-2 mt-8">
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PaymentMethodCard metrics={paymentMetrics} />
        <ClassCard metrics={classMetrics} />
      </div>

      <div className="mt-4">
        <RecentOrders orders={recentOrders} />
      </div>
    </div>
  )
}
