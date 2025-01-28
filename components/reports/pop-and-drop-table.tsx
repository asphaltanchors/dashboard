"use client"

import Link from "next/link"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { formatCurrency } from "@/lib/utils"

interface Company {
  id: string
  name: string | null
  domain: string
  currentTotal: number
  previousTotal: number
  percentageChange: number
}

interface Props {
  companies: Company[]
  type: 'increasing' | 'decreasing'
  limit?: number
}

export function PopAndDropTable({ companies, type, limit = 10 }: Props) {
  const filteredCompanies = companies
    .filter(company => type === 'increasing' ? company.percentageChange > 0 : company.percentageChange < 0)
    .sort((a, b) => type === 'increasing' 
      ? b.percentageChange - a.percentageChange 
      : a.percentageChange - b.percentageChange
    )
    .slice(0, limit)
  return (
    <DataTable
      data={filteredCompanies}
      columns={[
        {
          header: "Company",
          accessorKey: "name",
          sortable: true,
          cell: (company: Company) => (
            <Link 
              href={`/companies/${company.domain}`}
              className="text-blue-600 hover:underline"
            >
              {company.name || company.domain}
            </Link>
          )
        },
        {
          header: "Current Period",
          accessorKey: "currentTotal",
          sortable: true,
          cell: (company: Company) => formatCurrency(company.currentTotal)
        },
        {
          header: "Previous Period",
          accessorKey: "previousTotal",
          sortable: true,
          cell: (company: Company) => formatCurrency(company.previousTotal)
        },
        {
          header: "% Change",
          accessorKey: "percentageChange",
          sortable: true,
          cell: (company: Company) => (
            <div className="flex items-center gap-1">
              {company.percentageChange > 0 ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500" />
              ) : company.percentageChange < 0 ? (
                <ArrowDownIcon className="h-4 w-4 text-red-500" />
              ) : null}
              <span className={company.percentageChange > 0 ? "text-green-600" : company.percentageChange < 0 ? "text-red-600" : ""}>
                {company.percentageChange.toFixed(1)}%
              </span>
            </div>
          )
        }
      ]}
    />
  )
}
