import { prisma } from "@/lib/prisma"
import { ProductSalesMetric } from "@/types/reports"
import { FilterParams, ProductDetail, ProductLineMetric, buildFilterClauses, calculateDateRange, calculatePeriods } from "./common"

export async function getActualUnitsSold(filters?: FilterParams) {
  const { startDate } = calculateDateRange(filters?.dateRange)
  const { additionalFilters } = buildFilterClauses(filters)

  const results = await prisma.$queryRawUnsafe<Array<ProductSalesMetric>>(`
    WITH product_categories AS (
      SELECT 
        oi."productCode",
        CASE
          -- SP10
          WHEN "productCode" LIKE '01-6310%' OR "productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'SP10'
          -- SP12
          WHEN "productCode" LIKE '01-6315%' OR "productCode" IN ('01-6315.3SK', '01-6315.3SK-2') THEN 'SP12'
          -- SP18
          WHEN "productCode" LIKE '01-6318%' OR "productCode" = '01-6318.7SK' THEN 'SP18'
          -- SP58
          WHEN "productCode" LIKE '01-6358%' OR "productCode" IN ('01-6358.5SK', '01-6358.5SK-2') THEN 'SP58'
          -- am625
          WHEN "productCode" IN ('01-7014', '01-7014-FBA') THEN 'am625'
          ELSE 'Other'
        END as product_line,
        CASE 
          WHEN "productCode" IN ('01-6318.7SK', '01-6315.3SK', '01-6315.3SK-2', '01-6358.5SK', '01-6358.5SK-2') THEN 'Stainless Steel'
          WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' THEN 'Zinc Plated'
          WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
          WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Epoxy'
          WHEN "productCode" IN ('01-7014', '01-7014-FBA') THEN 'Plastic'
          WHEN "productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'Zinc Plated'
          ELSE 'Other'
        END as material_type,
        CASE 
          WHEN "productCode" = '01-7011.PST' THEN 4
          WHEN "productCode" = '01-7014' THEN 4
          WHEN "productCode" = '01-7014-FBA' THEN 4
          WHEN "productCode" = '01-7010-FBA' THEN 4
          WHEN "productCode" = '01-7010' THEN 4
          WHEN "productCode" = '01-7013' THEN 4
          WHEN "productCode" = '01-6310.72L' THEN 72
          ELSE 6
        END as quantity_multiplier,
        oi.quantity,
        oi.amount,
        oi."orderId"
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      WHERE (oi."productCode" LIKE '01-63%'
             OR oi."productCode" LIKE '01-70%')
      AND o."orderDate" >= '${startDate.toISOString()}'
      ${additionalFilters}
    )
    SELECT 
      product_line,
      material_type,
      COUNT(DISTINCT "orderId") as order_count,
      CAST(SUM(CAST(quantity AS numeric) * quantity_multiplier) AS text) as total_units
    FROM product_categories
    GROUP BY 
      product_line,
      material_type
    ORDER BY 
      product_line,
      material_type
  `)

  return results
}

// Material type analysis data
export async function getMaterialTypeMetrics(filters?: FilterParams) {
  const { startDate } = calculateDateRange(filters?.dateRange)
  const { additionalFilters } = buildFilterClauses(filters)

  const results = await prisma.$queryRawUnsafe<Array<{
    material_type: string
    order_count: string
    total_units: string
    total_revenue: string
  }>>(`
    SELECT 
      CASE 
        WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' AND "productCode" NOT LIKE '%3SK%' THEN 'Zinc Plated'
        WHEN "productCode" LIKE '%3SK%' THEN 'Stainless Steel'
        WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Epoxy'
        ELSE 'Other'
      END as material_type,
      COUNT(DISTINCT "orderId") as order_count,
      SUM(COALESCE(CAST(quantity AS numeric), 0)) as total_units,
      SUM(amount) as total_revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE (oi."productCode" LIKE '01-63%'
           OR oi."productCode" IN ('82-5002.K', '82-5002.010')
           OR oi."productCode" LIKE '82-6002%'
           OR oi."productCode" LIKE '01-70%')
    AND o."orderDate" >= '${startDate.toISOString()}'
    ${additionalFilters}
    GROUP BY 
      CASE 
        WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' AND "productCode" NOT LIKE '%3SK%' THEN 'Zinc Plated'
        WHEN "productCode" LIKE '%3SK%' THEN 'Stainless Steel'
        WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Epoxy'
        ELSE 'Other'
      END
    ORDER BY total_revenue DESC
  `)
  return results
}

// Product line performance data
export async function getProductLineMetrics(filters?: FilterParams) {
  const { currentPeriodStart, previousPeriodStart } = calculatePeriods(filters?.dateRange)
  const { additionalFilters } = buildFilterClauses(filters)

  // Get metrics for both periods
  const metrics = await prisma.$queryRawUnsafe<(ProductLineMetric & { period: string })[]>(`
    SELECT 
      CASE 
        WHEN "productCode" LIKE '01-6310%' THEN 'SP10'
        WHEN "productCode" LIKE '01-6315%' THEN 'SP12'
        WHEN "productCode" LIKE '01-6318%' THEN 'SP18'
        WHEN "productCode" LIKE '01-6358%' THEN 'SP58'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010') OR "productCode" LIKE '82-6002%' THEN 'Adhesives'
        WHEN "productCode" LIKE '01-70%' THEN 'Kits'
        ELSE 'Other'
      END as product_line,
      COUNT(DISTINCT "orderId") as order_count,
      SUM(COALESCE(CAST(quantity AS numeric), 0)) as total_units,
      SUM(amount) as total_revenue,
      CASE 
        WHEN o."orderDate" >= '${currentPeriodStart.toISOString()}' THEN 'current'
        ELSE 'previous'
      END as period
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE (oi."productCode" LIKE '01-63%' 
           OR oi."productCode" IN ('82-5002.K', '82-5002.010')
           OR oi."productCode" LIKE '82-6002%'
           OR oi."productCode" LIKE '01-70%')
    AND o."orderDate" >= '${previousPeriodStart.toISOString()}'
    ${additionalFilters}
    GROUP BY 
      CASE 
        WHEN "productCode" LIKE '01-6310%' THEN 'SP10'
        WHEN "productCode" LIKE '01-6315%' THEN 'SP12'
        WHEN "productCode" LIKE '01-6318%' THEN 'SP18'
        WHEN "productCode" LIKE '01-6358%' THEN 'SP58'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010') OR "productCode" LIKE '82-6002%' THEN 'Adhesives'
        WHEN "productCode" LIKE '01-70%' THEN 'Kits'
        ELSE 'Other'
      END,
      CASE 
        WHEN o."orderDate" >= '${currentPeriodStart.toISOString()}' THEN 'current'
        ELSE 'previous'
      END
  `)

  // Combine current and previous period data
  const metricsByLine = metrics.reduce((acc, metric) => {
    if (!acc[metric.product_line]) {
      acc[metric.product_line] = {
        product_line: metric.product_line,
        current_revenue: "0",
        previous_revenue: "0",
        order_count: metric.order_count,
        total_units: metric.total_units,
        total_revenue: metric.total_revenue
      }
    }
    
    if (metric.period === 'current') {
      acc[metric.product_line].current_revenue = metric.total_revenue
    } else {
      acc[metric.product_line].previous_revenue = metric.total_revenue
    }
    
    return acc
  }, {} as Record<string, {
    product_line: string
    current_revenue: string
    previous_revenue: string
    order_count: string
    total_units: string
    total_revenue: string
  }>)

  // Convert to array, sort, and filter out 'Other' category
  const combinedMetrics = Object.values(metricsByLine)
    .filter(metric => metric.product_line !== 'Other')
    .sort((a, b) => Number(b.current_revenue) - Number(a.current_revenue))

  // Get product details
  const productDetails = await prisma.product.findMany({
    where: {
      OR: [
        { productCode: { startsWith: '01-6310' } }, // SP10
        { productCode: { startsWith: '01-6315' } }, // SP12
        { productCode: { startsWith: '01-6318' } }, // SP18
        { productCode: { startsWith: '01-6358' } }, // SP58
        { productCode: { in: ['82-5002.K', '82-5002.010'] } }, // EPX2
        { productCode: { startsWith: '82-6002' } }, // EPX3
        { productCode: { startsWith: '01-70' } }, // Kits
      ]
    },
    select: {
      productCode: true,
      name: true,
      description: true
    }
  })

  // Group products by product line
  const productsByLine = productDetails.reduce((acc, product) => {
    let line = 'Other'
    if (product.productCode.startsWith('01-6310')) line = 'SP10'
    else if (product.productCode.startsWith('01-6315')) line = 'SP12'
    else if (product.productCode.startsWith('01-6318')) line = 'SP18'
    else if (product.productCode.startsWith('01-6358')) line = 'SP58'
    else if (['82-5002.K', '82-5002.010'].includes(product.productCode) || product.productCode.startsWith('82-6002')) line = 'Adhesives'
    else if (product.productCode.startsWith('01-70')) line = 'Kits'

    if (!acc[line]) acc[line] = []
    acc[line].push(product)
    return acc
  }, {} as Record<string, ProductDetail[]>)

  // Combine metrics with product details
  return combinedMetrics.map(metric => ({
    ...metric,
    products: productsByLine[metric.product_line] || []
  }))
}
