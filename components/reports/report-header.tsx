"use client"

import { DateRangeFilter } from "./date-range-filter"
import { TransactionAmountFilter } from "./transaction-amount-filter"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface ReportHeaderProps {
  title?: string
  resetPath?: string
  dateRange?: string
  minAmount?: number
  maxAmount?: number
}

export function ReportHeader({
  title = "Dashboard",
  resetPath = "/?date_range=365d",
  dateRange = "365d",
  minAmount,
  maxAmount
}: ReportHeaderProps) {
  const router = useRouter()
  const [resetKey, setResetKey] = useState(0)

  const handleReset = () => {
    setResetKey(prev => prev + 1)
    router.push(resetPath)
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
  )
}
