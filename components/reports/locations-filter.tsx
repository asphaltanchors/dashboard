"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface LocationsFilterProps {
  selected?: string[]
}

export function LocationsFilter({ selected = [] }: LocationsFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          Selected Locations
          {selected.length > 0 && (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-md shadow-lg z-10">
          <div className="p-4 text-sm text-gray-500">
            Location filtering will be available in Phase 2
          </div>
        </div>
      )}
    </div>
  )
}
