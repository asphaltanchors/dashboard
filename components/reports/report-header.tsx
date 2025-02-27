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
    <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      
      <div className="flex flex-col gap-4 w-full md:flex-row md:items-center md:ml-auto md:gap-4 lg:gap-6">
        {/* Date Range Filter */}
        <div className="w-full md:w-[180px] lg:w-[200px]">
          <DateRangeFilter key={`date-${resetKey}`} value={dateRange} />
        </div>
        
        {/* Transaction Amount Filter */}
        <div className="w-full md:w-[220px] lg:w-[300px]">
          <TransactionAmountFilter 
            key={`amount-${resetKey}`}
            min={minAmount}
            max={maxAmount}
          />
        </div>
        
        {/* Consumer Domains and Reset Button */}
        <div className="flex flex-col gap-4 w-full sm:flex-row sm:justify-between sm:items-end md:flex-col md:w-auto lg:flex-row lg:items-center lg:gap-4">
          {/* Consumer Domains Toggle */}
          <div className="flex flex-row justify-between items-center sm:flex-col sm:items-start md:flex-col lg:flex-col">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Consumer Domains
            </div>
            <div className="flex items-center">
              <Switch
                checked={filterConsumer}
                onCheckedChange={handleConsumerFilterChange}
              />
              <span className="ml-2 text-sm">
                {filterConsumer ? 'Hidden' : 'Shown'}
              </span>
            </div>
          </div>
          
          {/* Reset Button */}
          <div>
            <div className="mb-2 text-sm font-medium text-muted-foreground invisible hidden md:block lg:block">
              Actions
            </div>
            <Button 
              variant="outline" 
              onClick={handleReset}
              size="sm"
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
