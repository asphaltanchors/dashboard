import { GlobeWrapper } from "@/components/orders/globe-wrapper"
import { getOrders } from "@/lib/orders"
import { Suspense } from "react"

export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch the most recent 100 orders for the globe visualization
  const ordersData = await getOrders({
    pageSize: 100, // Limit to 100 orders to avoid excessive API usage
    sortColumn: 'orderDate', // Sort by date to get the most recent orders
    sortDirection: 'desc',
  })

  return (
    <Suspense fallback={<div className="min-h-screen">Loading...</div>}>
      <GlobeWrapper orders={ordersData.orders}>
        {children}
      </GlobeWrapper>
    </Suspense>
  )
}
