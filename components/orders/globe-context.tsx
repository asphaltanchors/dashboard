"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { TableOrder } from '@/types/orders'

interface OrdersGlobeContextType {
  orders: TableOrder[]
  setOrders: (orders: TableOrder[]) => void
  isDetailView: boolean
  setIsDetailView: (isDetail: boolean) => void
}

const OrdersGlobeContext = createContext<OrdersGlobeContextType | undefined>(undefined)

export function OrdersGlobeProvider({ children, initialOrders = [] }: { 
  children: ReactNode
  initialOrders?: TableOrder[]
}) {
  const [orders, setOrders] = useState<TableOrder[]>(initialOrders)
  const [isDetailView, setIsDetailView] = useState(false)
  const pathname = usePathname()
  
  // Reset to initial orders when navigating back to the main orders page
  useEffect(() => {
    if (pathname === '/orders') {
      setOrders(initialOrders)
      setIsDetailView(false)
    }
  }, [pathname, initialOrders])
  
  return (
    <OrdersGlobeContext.Provider value={{ 
      orders, 
      setOrders, 
      isDetailView, 
      setIsDetailView 
    }}>
      {children}
    </OrdersGlobeContext.Provider>
  )
}

export function useOrdersGlobe() {
  const context = useContext(OrdersGlobeContext)
  if (context === undefined) {
    throw new Error('useOrdersGlobe must be used within an OrdersGlobeProvider')
  }
  return context
}
