import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"

interface PaymentMethodMetric {
  method: string
  amount: number
}

interface PaymentMethodCardProps {
  metrics: PaymentMethodMetric[]
  className?: string
}

export function PaymentMethodCard({ metrics, className }: PaymentMethodCardProps) {
  const total = metrics.reduce((sum, metric) => sum + metric.amount, 0)

  // Sort payment methods by amount in descending order
  const sortedMetrics = [...metrics].sort((a, b) => b.amount - a.amount)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Revenue by Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedMetrics.map((metric) => {
            const percentage = (metric.amount / total) * 100
            return (
              <div key={metric.method} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{metric.method}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(metric.amount)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between font-medium">
            <span>Total Revenue</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
