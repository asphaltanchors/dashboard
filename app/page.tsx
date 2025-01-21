import { MetricCard } from "@/components/dashboard/metric-card"
import { PaymentMethodCard } from "@/components/dashboard/payment-method-card"
import { ClassCard } from "@/components/dashboard/class-card"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, ShoppingCart } from "lucide-react"
import { getOrderMetrics, getPaymentMethodMetrics, getClassMetrics, getRecentOrders } from "@/lib/dashboard"

export default async function Home() {
  const [metrics, paymentMetrics, classMetrics, recentOrders] = await Promise.all([
    getOrderMetrics(),
    getPaymentMethodMetrics(),
    getClassMetrics(),
    getRecentOrders()
  ])
  
  const { 
    currentTotalOrders, 
    orderChange, 
    currentTotalSales, 
    salesChange,
    currentAnnualSales,
    annualSalesChange
  } = metrics

  return (

    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="30d Orders (Seasonal)"
              value={currentTotalOrders}
              change={orderChange}
              icon={ShoppingCart}
            />
            <MetricCard
              title="30d Sales (Seasonal)"
              value={formatCurrency(currentTotalSales)}
              change={salesChange}
              icon={DollarSign}
            />
            <MetricCard
              title="Trailing 12 Months Sales"
              value={formatCurrency(currentAnnualSales)}
              change={annualSalesChange}
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
