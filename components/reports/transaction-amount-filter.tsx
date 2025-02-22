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
  
  // Raw input values for editing
  const [minValue, setMinValue] = useState(min?.toString() || "")
  const [maxValue, setMaxValue] = useState(max?.toString() || "")
  
  // Formatted values for display
  const [formattedMin, setFormattedMin] = useState("")
  const [formattedMax, setFormattedMax] = useState("")
  
  // Track if the change was from user input
  const isUserInput = useRef(false)
  const isEditing = useRef({ min: false, max: false })

  // Sync state with props and handle initial formatting
  useEffect(() => {
    if (!isUserInput.current) {
      const newMin = min?.toString() || ""
      const newMax = max?.toString() || ""
      setMinValue(newMin)
      setMaxValue(newMax)
      setFormattedMin(newMin ? formatCurrency(parseFloat(newMin)) : "")
      setFormattedMax(newMax ? formatCurrency(parseFloat(newMax)) : "")
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

  const sanitizeNumber = (value: string) => {
    // Allow only one decimal point and numbers
    const parts = value.split('.')
    if (parts.length > 2) return value.slice(0, -1)
    return value.replace(/[^\d.]/g, "")
  }

  const handleMinChange = (value: string) => {
    isUserInput.current = true
    const sanitized = sanitizeNumber(value)
    setMinValue(sanitized)
  }

  const handleMaxChange = (value: string) => {
    isUserInput.current = true
    const sanitized = sanitizeNumber(value)
    setMaxValue(sanitized)
  }

  const handleBlur = (field: 'min' | 'max') => {
    isEditing.current[field] = false
    const value = field === 'min' ? minValue : maxValue
    if (!value) {
      if (field === 'min') setFormattedMin("")
      else setFormattedMax("")
      return
    }
    const number = parseFloat(value)
    if (isNaN(number)) return
    const formatted = formatCurrency(number)
    if (field === 'min') {
      setFormattedMin(formatted)
    } else {
      setFormattedMax(formatted)
    }
  }

  const handleFocus = (field: 'min' | 'max') => {
    // Format the other field if it was being edited
    const otherField = field === 'min' ? 'max' : 'min'
    if (isEditing.current[otherField]) {
      handleBlur(otherField)
    }
    isEditing.current[field] = true
  }

  return (
    <div>
      <div className="mb-2 text-sm font-medium text-gray-500">
        Transaction Amount
      </div>
      <div className="flex gap-2 items-center">
      <Input
        type="text"
        placeholder="Min"
        value={isEditing.current.min ? minValue : formattedMin}
        onChange={(e) => handleMinChange(e.target.value)}
        onFocus={() => handleFocus('min')}
        onBlur={() => handleBlur('min')}
        className="w-full"
      />
      <span className="text-gray-500">-</span>
      <Input
        type="text"
        placeholder="Max"
        value={isEditing.current.max ? maxValue : formattedMax}
        onChange={(e) => handleMaxChange(e.target.value)}
        onFocus={() => handleFocus('max')}
        onBlur={() => handleBlur('max')}
        className="w-full"
      />
      </div>
    </div>
  )
}
