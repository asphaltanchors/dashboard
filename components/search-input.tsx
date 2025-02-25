"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import debounce from "lodash/debounce"

interface SearchInputProps {
  placeholder?: string
  defaultValue?: string
}

export function SearchInput({ 
  placeholder = "Search...", 
  defaultValue = "" 
}: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(defaultValue)

  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      })
      
      return newSearchParams.toString()
    },
    [searchParams]
  )

  const debouncedSearch = debounce((value: string) => {
    router.replace(
      `${pathname}?${createQueryString({
        search: value || null,
      })}`,
      { scroll: false }
    )
  }, 300)

  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
      <Input
        type="text"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => {
          setSearchValue(e.target.value)
          debouncedSearch(e.target.value)
        }}
        className="pl-10"
      />
    </div>
  )
}
