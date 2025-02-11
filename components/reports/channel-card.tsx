"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowDown, ArrowUp, BadgeDollarSign, Package, ShoppingCart } from "lucide-react"
import { ChannelCardProps } from "@/types/reports"

export function ChannelCard({ name, revenue, units, orders, averageOrder }: ChannelCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendColor = (trend?: "up" | "down" | "neutral") => {
    if (trend === "up") return "text-green-500"
    if (trend === "down") return "text-red-500"
    return "text-gray-500"
  }

  const TrendIndicator = ({ trend, change }: { trend?: "up" | "down" | "neutral"; change?: number }) => {
    if (!trend || trend === "neutral") return null

    return (
      <div className={`flex items-center gap-1 ${getTrendColor(trend)}`}>
        {trend === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        {change && <span className="text-sm">{change}%</span>}
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Channel Name */}
          <h3 className="text-xl font-semibold tracking-tight">{name}</h3>

          {/* Revenue Section */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(revenue.value)}</span>
                  <TrendIndicator trend={revenue.trend} change={revenue.change} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-muted-foreground">of total revenue</div>
                <div className="text-xl font-bold text-primary">{formatPercentage(revenue.percentage)}</div>
              </div>
            </div>
            <Progress value={revenue.percentage} className="h-2" />
          </div>

          {/* Units Section */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Units</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatNumber(units.value)}</span>
                  <TrendIndicator trend={units.trend} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-muted-foreground">of total units</div>
                <div className="text-xl font-bold text-primary">{formatPercentage(units.percentage)}</div>
              </div>
            </div>
            <Progress value={units.percentage} className="h-2" />
          </div>

          {/* Orders and Average Order Section */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Orders</span>
              </div>
              <div className="text-xl font-bold tracking-tight">{formatNumber(orders.value)}</div>
              <div className="text-sm text-muted-foreground">{formatPercentage(orders.percentage)} of total</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Avg. Order</span>
              </div>
              <div className="text-xl font-bold tracking-tight">{formatCurrency(averageOrder)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
