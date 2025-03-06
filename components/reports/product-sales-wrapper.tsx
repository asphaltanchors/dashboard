"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductSalesTable } from "@/components/reports/product-sales-table"
import SalesChannelTable from "@/components/reports/sales-channel-table"
import { SalesChannelMetric } from "@/types/reports"

interface SalesData {
  company_name: string
  company_domain: string
  order_count: number
  total_units: number
  total_sales: number
  sales_class: string
}

interface ProductSalesWrapperProps {
  salesData: SalesData[]
  channelMetrics: SalesChannelMetric[]
}

export function ProductSalesWrapper({ salesData, channelMetrics }: ProductSalesWrapperProps) {
  const [selectedClass, setSelectedClass] = useState<string>("all")

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sales Channel Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChannelTable 
            metrics={channelMetrics} 
            onChannelClick={setSelectedClass}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductSalesTable 
            data={salesData}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
          />
        </CardContent>
      </Card>
    </>
  )
} 