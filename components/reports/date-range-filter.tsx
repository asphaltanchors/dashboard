"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const DATE_RANGES = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 60 Days", value: "60d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "Last 180 Days", value: "180d" },
  { label: "Last 365 Days", value: "365d" },
] as const

interface DateRangeFilterProps {
  value?: string
}

export function DateRangeFilter({ value = "365d" }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedRange = DATE_RANGES.find(range => range.value === value) || DATE_RANGES[5] // Default to 365 days

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date_range", value)
    router.push(`?${params.toString()}`)
    setIsOpen(false)
  }

  return (
    <div>
      <div className="mb-2 text-sm font-medium text-gray-500">
        Date Range
      </div>
      <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedRange.label}
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-md shadow-lg z-10">
          <div className="py-1">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                  range.value === value ? "bg-gray-50" : ""
                }`}
                onClick={() => handleSelect(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
