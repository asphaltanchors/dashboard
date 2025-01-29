"use client"

import { PeriodSelector } from "@/components/reports/period-selector"
import { PopAndDropTable } from "@/components/reports/pop-and-drop-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Company {
  id: string
  name: string | null
  domain: string
  currentTotal: number
  previousTotal: number
  percentageChange: number
}

interface Props {
  months: number
  companies: Company[]
  summary: {
    increasingCount: number
    decreasingCount: number
    averageIncrease: number
    averageDecrease: number
  }
}

export function PopAndDropContent({ months, companies, summary }: Props) {
  return (
    <div className="p-8">
      <div className="container mx-auto py-10">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Pop & Drop Report</h1>
            <p className="text-muted-foreground">
              Companies with the biggest percentage changes in order volume
            </p>
          </div>
          <PeriodSelector defaultValue={months} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <MetricCard
            title="Growing Companies"
            value={summary.increasingCount}
            change={summary.averageIncrease.toFixed(1)}
            icon={TrendingUp}
          />
          <MetricCard
            title="Declining Companies"
            value={summary.decreasingCount}
            change={summary.averageDecrease.toFixed(1)}
            icon={TrendingDown}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-md border">
            <div className="border-b bg-muted/50 p-4">
              <h2 className="text-lg font-semibold">Top Gainers</h2>
              <p className="text-sm text-muted-foreground">Companies with the largest order increases</p>
            </div>
            <div className="p-4">
              <PopAndDropTable 
                companies={companies} 
                type="increasing"
                limit={10}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <div className="border-b bg-muted/50 p-4">
              <h2 className="text-lg font-semibold">Top Decliners</h2>
              <p className="text-sm text-muted-foreground">Companies with the largest order decreases</p>
            </div>
            <div className="p-4">
              <PopAndDropTable 
                companies={companies} 
                type="decreasing"
                limit={10}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
