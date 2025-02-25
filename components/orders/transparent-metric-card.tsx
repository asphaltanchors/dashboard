"use client"

import { LucideIcon } from "lucide-react"

interface TransparentMetricCardProps {
  title: string
  value: string | number
  change?: string
  icon: LucideIcon
  action?: React.ReactNode
}

export function TransparentMetricCard({ title, value, change, icon: Icon, action }: TransparentMetricCardProps) {
  const changeNum = change ? Number(change) : null
  
  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow transition-all hover:bg-white/80">
      <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <div className="font-semibold leading-none tracking-tight text-sm">{title}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-6 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs ${changeNum! >= 0 ? "text-green-500" : "text-red-500"}`}>
            {change}% change vs
          </p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
