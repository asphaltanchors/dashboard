"use client"

import { useEffect } from 'react'
import { useOrdersGlobe } from './globe-context'
import type { TableOrder } from '@/types/orders'

export function SingleOrderGlobeProvider({ order }: { order: TableOrder }) {
  const { setOrders, setIsDetailView } = useOrdersGlobe()
  
  useEffect(() => {
    // Update the globe to show only this order
    setOrders([order])
    // Mark that we're in detail view
    setIsDetailView(true)
    
    // Cleanup function to reset when navigating away
    return () => {
      // We don't reset here because the layout will re-render with the initial orders
      // and the context's useEffect will handle resetting when navigating to /orders
    }
  }, [order, setOrders, setIsDetailView])
  
  // This is a context provider only, it doesn't render anything
  return null
}
