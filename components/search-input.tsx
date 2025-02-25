"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import debounce from "lodash/debounce"

interface SearchInputProps {
  placeholder?: string
  defaultValue?: string
  minChars?: number
}

export function SearchInput({ 
  placeholder = "Search...", 
  defaultValue = "",
  minChars = 2
}: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(defaultValue)
  
  // Create a ref to store the debounced function
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null)

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

  // Initialize the debounced function once
  useEffect(() => {
    debouncedSearchRef.current = debounce((value: string) => {
      // Only search if the value is empty or meets the minimum character threshold
      if (value === "" || value.length >= minChars) {
        router.replace(
          `${pathname}?${createQueryString({
            search: value || null,
          })}`,
          { scroll: false }
        )
      }
    }, 250)

    // Cleanup function to cancel any pending debounced calls when component unmounts
    return () => {
      debouncedSearchRef.current?.cancel()
    }
  }, [createQueryString, minChars, pathname, router])

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
    
    // Cancel any pending debounced calls
    debouncedSearchRef.current?.cancel()
    
    // Trigger the debounced search
    debouncedSearchRef.current?.(value)
  }, [])

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
        onChange={(e) => handleSearchChange(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}
