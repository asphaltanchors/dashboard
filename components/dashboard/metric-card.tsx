import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change: string
  icon: LucideIcon
}

export function MetricCard({ title, value, change, icon: Icon }: MetricCardProps) {
  const changeNum = Number(change)
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${changeNum >= 0 ? "text-green-500" : "text-red-500"}`}>
          {change}% change vs
        </p>
      </CardContent>
    </Card>
  )
}
