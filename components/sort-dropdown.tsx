"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

const SORT_OPTIONS = [
  { label: "Total Orders", value: "totalOrders" },
  { label: "Revenue", value: "revenue" },
] as const

interface SortDropdownProps {
  value?: string
}

export function SortDropdown({ value = "totalOrders" }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const selectedOption = SORT_OPTIONS.find(option => option.value === value) || SORT_OPTIONS[0]

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption.label}
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-md shadow-lg z-10">
          <div className="py-1">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                  option.value === value ? "bg-gray-50" : ""
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
