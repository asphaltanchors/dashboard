export interface SalesChannelMetric {
  sales_channel: string
  current_period: {
    order_count: string
    total_units: string
    total_revenue: string
    avg_unit_price: string
  }
  previous_period: {
    order_count: string
    total_units: string
    total_revenue: string
    avg_unit_price: string
  }
}

export interface ChannelCardProps {
  name: string
  revenue: {
    value: number
    percentage: number
    trend?: "up" | "down" | "neutral"
    change?: number
  }
  units: {
    value: number
    percentage: number
    trend?: "up" | "down" | "neutral"
    change?: number
  }
  orders: {
    value: number
    percentage: number
  }
  averageOrder: number
}
