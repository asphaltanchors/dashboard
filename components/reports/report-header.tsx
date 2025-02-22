"use client"

import { DateRangeFilter } from "./date-range-filter"
import { TransactionAmountFilter } from "./transaction-amount-filter"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Switch } from "@/components/ui/switch"

interface ReportHeaderProps {
  title?: string
  resetPath?: string
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

export function ReportHeader({
  title = "Dashboard",
  resetPath = "/?date_range=365d",
  dateRange = "365d",
  minAmount,
  maxAmount,
  filterConsumer = false
}: ReportHeaderProps) {
  const router = useRouter()
  const [resetKey, setResetKey] = useState(0)

  const handleReset = () => {
    setResetKey(prev => prev + 1)
    // Reset should clear the filterConsumer param too
    const url = new URL(resetPath, window.location.href)
    url.searchParams.delete('filterConsumer')
    router.push(url.toString())
  }

  const handleConsumerFilterChange = (checked: boolean) => {
    const url = new URL(window.location.href)
    if (checked) {
      url.searchParams.set('filterConsumer', 'true')
    } else {
      url.searchParams.delete('filterConsumer')
    }
    router.push(url.pathname + url.search)
  }

  return (
    <div className="flex items-center gap-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-4 ml-auto">
        <div className="w-[200px]">
          <DateRangeFilter key={`date-${resetKey}`} value={dateRange} />
        </div>
        <div className="w-[300px]">
          <TransactionAmountFilter 
            key={`amount-${resetKey}`}
            min={minAmount}
            max={maxAmount}
          />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <div className="mb-2 text-sm font-medium text-gray-500">
              Consumer Domains
            </div>
            <Switch
              checked={filterConsumer}
              onCheckedChange={handleConsumerFilterChange}
            />
            <span className="ml-2 text-sm">
              {filterConsumer ? 'Hidden' : 'Shown'}
            </span>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-gray-500 invisible">
              Actions
            </div>
            <div>
              <Button 
                variant="outline" 
                onClick={handleReset}
                size="sm"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
