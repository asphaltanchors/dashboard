import { getProductLineMetrics } from "@/lib/reports"
import { ProductLineReference } from "./product-line-reference"
import { FilterParams } from "@/lib/reports/common"
import { prisma } from "@/lib/prisma"

export async function ProductLineReferenceContainer({
  dateRange,
  minAmount,
  maxAmount,
  filterConsumer
}: FilterParams = {}) {
  // Get product line metrics with filters
  const metrics = await getProductLineMetrics({
    dateRange,
    minAmount,
    maxAmount,
    filterConsumer
  })
  
  // Sort by revenue and take top 5 to match chart
  const sortedMetrics = [...metrics]
    .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
    .slice(0, 5)

  // Get total sales for each product
  const productCodes = sortedMetrics.flatMap(metric => 
    metric.products.map(product => product.productCode)
  )

  // Build filter clauses for the query
  const filterClauses = []
  if (dateRange) {
    const days = parseInt(dateRange.replace("d", ""))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    filterClauses.push(`o."orderDate" >= '${startDate.toISOString()}'`)
  }
  if (minAmount) {
    filterClauses.push(`o."totalAmount" >= ${minAmount}`)
  }
  if (maxAmount) {
    filterClauses.push(`o."totalAmount" <= ${maxAmount}`)
  }
  if (filterConsumer) {
    filterClauses.push(`
      NOT EXISTS (
        SELECT 1 FROM "Customer" c
        JOIN "Company" comp ON c."companyDomain" = comp."domain"
        WHERE c."id" = o."customerId"
        AND comp."domain" = ANY(ARRAY['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'])
      )
    `)
  }

  const whereClause = filterClauses.length > 0 
    ? `WHERE ${filterClauses.join(' AND ')}`
    : ''

  // Query to get total sales for each product
  const productSales = await prisma.$queryRawUnsafe<Array<{
    productCode: string
    total_sales: string | { toString(): string }
  }>>(`
    SELECT 
      oi."productCode",
      SUM(oi.amount) as total_sales
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    ${whereClause}
    GROUP BY oi."productCode"
    HAVING oi."productCode" = ANY(ARRAY[${productCodes.map(code => `'${code}'`).join(',')}])
  `)

  // Create a map of product code to total sales
  const salesMap = productSales.reduce((map, item) => {
    // Convert Decimal to string to avoid serialization issues
    map[item.productCode] = typeof item.total_sales === 'object' && item.total_sales !== null
      ? String(item.total_sales)
      : String(item.total_sales)
    return map
  }, {} as Record<string, string>)

  // Add total sales to each product
  const referenceData = sortedMetrics.map(metric => ({
    product_line: metric.product_line,
    products: metric.products.map(product => ({
      ...product,
      total_sales: salesMap[product.productCode] || '0'
    }))
  }))

  return <ProductLineReference data={referenceData} />
}
