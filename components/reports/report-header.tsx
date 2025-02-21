"use client"

import { DateRangeFilter } from "./date-range-filter"
import { TransactionAmountFilter } from "./transaction-amount-filter"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface ReportHeaderProps {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
}

export function ReportHeader({
  dateRange = "365d",
  minAmount,
  maxAmount
}: ReportHeaderProps) {
  const router = useRouter()
  const [resetKey, setResetKey] = useState(0)

  const handleReset = () => {
    setResetKey(prev => prev + 1)
    router.push("/?date_range=365d")
  }

  return (
    <div className="flex items-center gap-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
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
        <Button 
          variant="outline" 
          onClick={handleReset}
          size="sm"
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
