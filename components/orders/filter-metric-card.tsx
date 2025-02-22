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
    <Card onClick={handleFilterClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <p className="text-xs text-muted-foreground">
          {filter === 'unpaid-only' ? 'Click to show all' : 'Click to filter unpaid'}
        </p>
      </CardContent>
    </Card>
  )
}
