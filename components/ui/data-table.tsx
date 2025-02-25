import React, { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableColumn<T> {
  header: string
  accessorKey: keyof T
  cell?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  defaultSort?: {
    key: keyof T
    direction: 'asc' | 'desc'
  }
}

export function DataTable<T>({ data, columns, defaultSort }: DataTableProps<T>): React.ReactElement {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null
    direction: 'asc' | 'desc' | null
  }>({ 
    key: defaultSort?.key || null, 
    direction: defaultSort?.direction || null 
  })

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' | null = 'asc'

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc'
      else if (sortConfig.direction === 'desc') direction = null
    }

    setSortConfig({ key, direction })
  }

  const sortedData = sortConfig.key && sortConfig.direction
    ? [...data].sort((a: T, b: T) => {
        const aValue = a[sortConfig.key!]
        const bValue = b[sortConfig.key!]

        if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1
        if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
        }

        const aString = String(aValue).toLowerCase()
        const bString = String(bValue).toLowerCase()

        return sortConfig.direction === 'asc'
          ? aString.localeCompare(bString)
          : bString.localeCompare(aString)
      })
    : data

  const getSortIcon = (key: keyof T) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="size-4" />
    if (sortConfig.direction === 'asc') return <ChevronUp className="size-4" />
    if (sortConfig.direction === 'desc') return <ChevronDown className="size-4" />
    return <ChevronsUpDown className="size-4" />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={String(column.accessorKey)}
              className={cn(
                column.sortable && "cursor-pointer select-none",
                typeof data[0]?.[column.accessorKey] === 'number' && "text-right"
              )}
              onClick={() => column.sortable && handleSort(column.accessorKey)}
            >
              <div className="flex items-center gap-1 justify-between">
                <span>{column.header}</span>
                {column.sortable && (
                  <span className="text-muted-foreground">
                    {getSortIcon(column.accessorKey)}
                  </span>
                )}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center">
              No results found
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell
                  key={String(column.accessorKey)}
                  className={cn(
                    typeof item[column.accessorKey] === 'number' && "text-right"
                  )}
                >
                  {column.cell ? column.cell(item) : String(item[column.accessorKey])}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
