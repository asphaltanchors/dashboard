"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"

interface FilterMetricCardProps {
  value: number
}

export function FilterMetricCard({ value }: FilterMetricCardProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const filter = searchParams.get('filter')

  const handleFilterClick = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'unpaid-only') {
      params.delete('filter')
    } else {
      params.set('filter', 'unpaid-only')
    }
    params.set('page', '1') // Reset to first page when filtering
    router.replace(`?${params.toString()}`)
  }

  const formattedValue = value.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return (
    <Card 
      onClick={handleFilterClick}
      className={`cursor-pointer transition-colors hover:bg-accent ${
        filter === 'unpaid-only' ? 'bg-accent border-primary' : ''
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
        <DollarSign className={`h-4 w-4 ${
          filter === 'unpaid-only' ? 'text-primary' : 'text-muted-foreground'
        }`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className={`h-2 w-2 rounded-full ${
            filter === 'unpaid-only' ? 'bg-primary' : 'bg-muted'
          }`} />
          <p className="text-xs text-muted-foreground">
            {filter === 'unpaid-only' ? 'Showing unpaid only' : 'Click to show unpaid'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
