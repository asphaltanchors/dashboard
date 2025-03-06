import { ReportHeader } from "@/components/reports/report-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductSalesTable } from "@/components/reports/product-sales-table"
import { ProductSalesChart } from "@/components/reports/product-sales-chart"
import { prisma } from "@/lib/prisma"
import SalesChannelTable from "@/components/reports/sales-channel-table"
import { getProductSalesChannelMetrics } from "@/lib/reports/channels"

type PageProps = {
  params: Promise<{
    productCode: string
  }>
  searchParams: Promise<{
    date_range?: string
    min_amount?: string
    max_amount?: string
    filterConsumer?: string
  }>
}

export default async function ProductSalesPage({ params, searchParams }: PageProps) {
  const { productCode } = await params
  const searchParamsData = await searchParams
  const date_range = searchParamsData.date_range || "365d"
  const filterConsumer = searchParamsData.filterConsumer !== undefined
  const min_amount = searchParamsData.min_amount
  const max_amount = searchParamsData.max_amount

  const filters = {
    dateRange: date_range,
    minAmount: min_amount ? parseFloat(min_amount) : undefined,
    maxAmount: max_amount ? parseFloat(max_amount) : undefined,
    filterConsumer
  }

  // Get product details
  const product = await prisma.product.findUnique({
    where: { productCode },
    select: {
      name: true,
      description: true
    }
  })

  // Get quarterly sales data for all time
  const quarterlySalesData = await prisma.$queryRawUnsafe<Array<{
    quarter: string
    total_sales: string
  }>>(`
    WITH quarters AS (
      SELECT generate_series(
        DATE_TRUNC('quarter', (SELECT MIN(o."orderDate") FROM "Order" o)),
        DATE_TRUNC('quarter', NOW()),
        interval '3 months'
      ) as quarter
    )
    SELECT 
      q.quarter::text as quarter,
      COALESCE(CAST(SUM(oi.amount) AS text), '0') as total_sales
    FROM quarters q
    LEFT JOIN "Order" o ON DATE_TRUNC('quarter', o."orderDate") = q.quarter
    LEFT JOIN "OrderItem" oi ON o."id" = oi."orderId" AND oi."productCode" = $1
    GROUP BY q.quarter
    ORDER BY q.quarter ASC
  `, productCode)

  // Get sales data for this specific product with filters
  const salesData = await prisma.$queryRawUnsafe<Array<{
    company_name: string
    company_domain: string
    order_count: string
    total_units: string
    total_sales: string
    sales_class: string
  }>>(`
    WITH company_classes AS (
      SELECT 
        c."companyDomain",
        o.class as sales_class,
        COUNT(*) as class_count,
        ROW_NUMBER() OVER (PARTITION BY c."companyDomain" ORDER BY COUNT(*) DESC) as rn
      FROM "Order" o
      JOIN "Customer" c ON c."id" = o."customerId"
      WHERE o.class IS NOT NULL
      GROUP BY c."companyDomain", o.class
    )
    SELECT 
      comp.name as company_name,
      comp.domain as company_domain,
      COUNT(DISTINCT oi."orderId") as order_count,
      CAST(SUM(CAST(oi.quantity AS numeric) * 
        CASE 
          WHEN oi."productCode" = '01-7011.PST' THEN 4
          WHEN oi."productCode" = '01-7014' THEN 4
          WHEN oi."productCode" = '01-7014-FBA' THEN 4
          WHEN oi."productCode" = '01-7010-FBA' THEN 4
          WHEN oi."productCode" = '01-7010' THEN 4
          WHEN oi."productCode" = '01-7013' THEN 4
          WHEN oi."productCode" = '01-6310.72L' THEN 72
          ELSE 6
        END) AS text) as total_units,
      CAST(SUM(oi.amount) AS text) as total_sales,
      CASE 
        WHEN cc.sales_class LIKE 'Amazon Combined:%' THEN TRIM(SPLIT_PART(cc.sales_class, ':', 2))
        ELSE COALESCE(cc.sales_class, 'Unclassified')
      END as sales_class
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    JOIN "Customer" c ON c."id" = o."customerId"
    JOIN "Company" comp ON comp."domain" = c."companyDomain"
    LEFT JOIN company_classes cc ON cc."companyDomain" = comp.domain AND cc.rn = 1
    WHERE oi."productCode" = $1
    AND o."orderDate" >= NOW() - INTERVAL '${date_range}'
    ${filterConsumer ? "AND comp.domain NOT IN ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com')" : ""}
    ${min_amount ? `AND o.amount >= ${min_amount}` : ""}
    ${max_amount ? `AND o.amount <= ${max_amount}` : ""}
    GROUP BY comp.name, comp.domain, cc.sales_class
    HAVING SUM(oi.amount) > 0
    ORDER BY total_sales DESC
  `, productCode)

  // Get channel metrics
  const channelMetrics = await getProductSalesChannelMetrics(productCode, filters)

  return (
    <div className="space-y-6 p-8">
      <div className="space-y-2">
        <ReportHeader
          title={`${product?.name || productCode} Sales Analysis`}
          resetPath={`/reports/product-sales/${productCode}?date_range=365d`}
          dateRange={date_range}
          minAmount={min_amount ? parseFloat(min_amount) : undefined}
          maxAmount={max_amount ? parseFloat(max_amount) : undefined}
          filterConsumer={filterConsumer}
        />
        
        {product?.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}
      </div>

      <div className="grid gap-8">
        <ProductSalesChart 
          data={quarterlySalesData.map(item => ({
            month: new Date(item.quarter).toISOString(),
            total_sales: Number(item.total_sales)
          }))}
        />

        <Card>
          <CardHeader>
            <CardTitle>Sales Channel Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChannelTable metrics={channelMetrics} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Sales Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSalesTable 
              data={salesData.map(item => ({
                ...item,
                order_count: Number(item.order_count),
                total_units: Number(item.total_units),
                total_sales: Number(item.total_sales)
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 