"use client"

import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { formatCurrency } from "@/lib/utils"

interface TransactionAmountFilterProps {
  min?: number
  max?: number
}

export function TransactionAmountFilter({ min, max }: TransactionAmountFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [minValue, setMinValue] = useState(min?.toString() || "")
  const [maxValue, setMaxValue] = useState(max?.toString() || "")
  
  // Track if the change was from user input
  const isUserInput = useRef(false)

  // Sync state with props
  useEffect(() => {
    if (!isUserInput.current) {
      setMinValue(min?.toString() || "")
      setMaxValue(max?.toString() || "")
    }
  }, [min, max])

  // Debounce URL updates only for user input
  useEffect(() => {
    if (!isUserInput.current) {
      return
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      
      if (minValue) {
        params.set("min_amount", minValue)
      } else {
        params.delete("min_amount")
      }
      
      if (maxValue) {
        params.set("max_amount", maxValue)
      } else {
        params.delete("max_amount")
      }

      router.push(`?${params.toString()}`)
    }, 500)

    return () => clearTimeout(timer)
  }, [minValue, maxValue, router, searchParams])

  const handleMinChange = (value: string) => {
    isUserInput.current = true
    // Remove non-numeric characters except decimal point
    const sanitized = value.replace(/[^\d.]/g, "")
    setMinValue(sanitized)
  }

  const handleMaxChange = (value: string) => {
    isUserInput.current = true
    // Remove non-numeric characters except decimal point
    const sanitized = value.replace(/[^\d.]/g, "")
    setMaxValue(sanitized)
  }

  const formatValue = (value: string) => {
    if (!value) return ""
    const number = parseFloat(value)
    if (isNaN(number)) return ""
    return formatCurrency(number)
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        type="text"
        placeholder="Min"
        value={formatValue(minValue)}
        onChange={(e) => handleMinChange(e.target.value)}
        className="w-full"
      />
      <span className="text-gray-500">-</span>
      <Input
        type="text"
        placeholder="Max"
        value={formatValue(maxValue)}
        onChange={(e) => handleMaxChange(e.target.value)}
        className="w-full"
      />
    </div>
  )
}
