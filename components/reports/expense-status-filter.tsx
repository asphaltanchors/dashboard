"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const EXPENSE_STATUSES = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" }
] as const

interface ExpenseStatusFilterProps {
  value?: string
}

export function ExpenseStatusFilter({ value = "all" }: ExpenseStatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedStatus = EXPENSE_STATUSES.find(status => status.value === value) || EXPENSE_STATUSES[0]

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    router.push(`?${params.toString()}`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedStatus.label}
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-md shadow-lg z-10">
          <div className="py-1">
            {EXPENSE_STATUSES.map((status) => (
              <button
                key={status.value}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                  status.value === value ? "bg-gray-50" : ""
                }`}
                onClick={() => handleSelect(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
