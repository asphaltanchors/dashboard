"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DateRangeOption = {
  label: string
  value: string
  description?: string
}

const dateRangeOptions: DateRangeOption[] = [
  { value: "last-12-months", label: "Last 12 Months", description: "The previous 12 months" },
  { value: "last-90-days", label: "Last 90 Days", description: "The previous 90 days" },
  { value: "last-30-days", label: "Last 30 Days", description: "The previous 30 days" },
  { value: "ytd", label: "Year to Date", description: "From January 1st to today" },
  { value: "last-month", label: "Last Month", description: "The previous full month" },
  { value: "mtd", label: "Month to Date", description: "Current month so far" },
]

export function DateRangePicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Get the selected range from URL params or default to last-12-months
  const selectedRange = searchParams.get("range") || "last-12-months"
  
  const handleRangeChange = (value: string) => {
    if (!value) return
    
    // Create new URLSearchParams with the current values
    const params = new URLSearchParams(searchParams.toString())
    
    // Update or add the range parameter
    params.set("range", value)
    
    // Navigate to the same page with updated query parameters
    router.push(`${pathname}?${params.toString()}`)
  }
  
  // Find the selected option label
  const selectedOption = dateRangeOptions.find(option => option.value === selectedRange)
  
  return (
    <div className="flex items-center">
      <Select value={selectedRange} onValueChange={handleRangeChange}>
        <SelectTrigger
          className="w-56 md:w-44"
          size="sm"
          aria-label="Select date range"
        >
          <SelectValue>{selectedOption?.label || "Select date range"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {dateRangeOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
            >
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}