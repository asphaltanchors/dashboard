import { OrdersGlobeProvider } from "@/components/orders/globe-context"
import { GlobeWrapper } from "@/components/orders/globe-wrapper"
import { getOrders } from "@/lib/orders"

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
    <OrdersGlobeProvider initialOrders={ordersData.orders}>
      <GlobeWrapper>
        {children}
      </GlobeWrapper>
    </OrdersGlobeProvider>
  )
}
