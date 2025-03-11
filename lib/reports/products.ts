import { prisma } from "@/lib/prisma"
import { ProductSalesMetric } from "@/types/reports"
import { FilterParams, ProductDetail, ProductLineMetric, buildFilterClauses, calculateDateRange, calculatePeriods } from "./common"

// Combined product reference and sales data
export async function getProductReferenceAndSales(filters?: FilterParams) {
  const { startDate } = calculateDateRange(filters?.dateRange)
  const { additionalFilters } = buildFilterClauses(filters)

  const results = await prisma.$queryRawUnsafe<Array<{
    product_line: string
    material_type: string
    productCode: string
    name: string | null
    description: string | null
    order_count: string
    total_units: string
    total_sales: string
    total_cost: string
    profit: string
  }>>(`
    SELECT 
      -- Product categorization
      CASE
        WHEN oi."productCode" LIKE '01-6310%' OR oi."productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'SP10'
        WHEN oi."productCode" LIKE '01-6315%' OR oi."productCode" IN ('01-6315.3SK', '01-6315.3SK-2') THEN 'SP12'
        WHEN oi."productCode" LIKE '01-6318%' OR oi."productCode" = '01-6318.7SK' THEN 'SP18'
        WHEN oi."productCode" LIKE '01-6358%' OR oi."productCode" IN ('01-6358.5SK', '01-6358.5SK-2') THEN 'SP58'
        WHEN oi."productCode" IN ('01-7014', '01-7014-FBA') THEN 'am625'
        WHEN oi."productCode" LIKE '01-8003%' OR oi."productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Adhesives'
        ELSE 'Other'
      END as product_line,
      
      -- Material type categorization
      CASE 
        WHEN oi."productCode" IN ('01-6318.7SK', '01-6315.3SK', '01-6315.3SK-2', '01-6358.5SK', '01-6358.5SK-2') THEN 'Stainless Steel'
        WHEN oi."productCode" LIKE '01-63%' AND oi."productCode" NOT LIKE '%-D' THEN 'Zinc Plated'
        WHEN oi."productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN oi."productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Adhesives'
        WHEN oi."productCode" IN ('01-7014', '01-7014-FBA') THEN 'Plastic'
        WHEN oi."productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'Zinc Plated'
        WHEN oi."productCode" LIKE '01-8003%' THEN 'Tools'
        ELSE 'Other'
      END as material_type,
      
      -- Product details
      oi."productCode",
      p."name",
      p."description",
      
      -- Metrics
      COUNT(DISTINCT oi."orderId") as order_count,
      CAST(SUM(CAST(oi.quantity AS numeric) * COALESCE(p."unitsPerPackage", 6)) AS text) as total_units,
      CAST(SUM(oi.amount) AS text) as total_sales,
      
      -- Cost and profit calculations
      CAST(SUM(CAST(oi.quantity AS numeric) * COALESCE(p."cost", 0)) AS text) as total_cost,
      CAST(
        CASE 
          WHEN SUM(
            CASE 
              WHEN LOWER(oi.description) LIKE '%shipping%' OR LOWER(oi.description) LIKE '%freight%' OR 
                   LOWER(p.name) LIKE '%shipping%' OR LOWER(p.name) LIKE '%freight%' 
              THEN 0 
              ELSE oi.amount 
            END
          ) > 0 
          THEN 
            ((SUM(
              CASE 
                WHEN LOWER(oi.description) LIKE '%shipping%' OR LOWER(oi.description) LIKE '%freight%' OR 
                     LOWER(p.name) LIKE '%shipping%' OR LOWER(p.name) LIKE '%freight%' 
                THEN 0 
                ELSE oi.amount 
              END
            ) - SUM(CAST(oi.quantity AS numeric) * COALESCE(p."cost", 0))) / 
            SUM(
              CASE 
                WHEN LOWER(oi.description) LIKE '%shipping%' OR LOWER(oi.description) LIKE '%freight%' OR 
                     LOWER(p.name) LIKE '%shipping%' OR LOWER(p.name) LIKE '%freight%' 
                THEN 0 
                ELSE oi.amount 
              END
            ) * 100)
          ELSE 0
        END
        AS text) as profit
      
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    LEFT JOIN "Product" p ON p."productCode" = oi."productCode"
    
    WHERE (oi."productCode" LIKE '01-63%'
           OR oi."productCode" LIKE '01-70%'
           OR oi."productCode" LIKE '01-8003%'
           OR oi."productCode" IN ('82-5002.K', '82-5002.010', '82-6002'))
    AND o."orderDate" >= '${startDate.toISOString()}'
    ${additionalFilters}
    
    GROUP BY 
      product_line,
      material_type,
      oi."productCode",
      p."name",
      p."description"
    
    HAVING SUM(oi.amount) > 0
    
    ORDER BY 
      total_sales DESC
  `)

  return results
}

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
          -- Adhesives
          WHEN "productCode" LIKE '01-8003%' THEN 'Adhesives'
          ELSE 'Other'
        END as product_line,
        CASE 
          WHEN "productCode" IN ('01-6318.7SK', '01-6315.3SK', '01-6315.3SK-2', '01-6358.5SK', '01-6358.5SK-2') THEN 'Stainless Steel'
          WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' THEN 'Zinc Plated'
          WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
          WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Adhesives'
          WHEN "productCode" IN ('01-7014', '01-7014-FBA') THEN 'Plastic'
          WHEN "productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'Zinc Plated'
          WHEN "productCode" LIKE '01-8003%' THEN 'Tools'
          ELSE 'Other'
        END as material_type,
        COALESCE(p."unitsPerPackage", 6) as quantity_multiplier,
        oi.quantity,
        oi.amount,
        oi."orderId"
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      LEFT JOIN "Product" p ON p."productCode" = oi."productCode"
      WHERE (oi."productCode" LIKE '01-63%'
             OR oi."productCode" LIKE '01-70%'
             OR oi."productCode" LIKE '01-8003%')
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
        WHEN "productCode" IN ('01-6318.7SK', '01-6315.3SK', '01-6315.3SK-2', '01-6358.5SK', '01-6358.5SK-2') THEN 'Stainless Steel'
        WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' THEN 'Zinc Plated'
        WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Adhesives'
        WHEN "productCode" IN ('01-7014', '01-7014-FBA') THEN 'Plastic'
        WHEN "productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'Zinc Plated'
        WHEN "productCode" LIKE '01-8003%' THEN 'Tools'
        ELSE 'Other'
      END as material_type,
      COUNT(DISTINCT "orderId") as order_count,
      SUM(COALESCE(CAST(quantity AS numeric), 0)) as total_units,
      SUM(amount) as total_revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    WHERE (oi."productCode" LIKE '01-63%'
           OR oi."productCode" IN ('82-5002.K', '82-5002.010', '82-6002', '01-7014', '01-7014-FBA', '01-7011.PST', '01-7010-FBA', '01-7010', '01-7013')
           OR oi."productCode" LIKE '01-8003%')
    AND o."orderDate" >= '${startDate.toISOString()}'
    ${additionalFilters}
    GROUP BY 
      CASE 
        WHEN "productCode" IN ('01-6318.7SK', '01-6315.3SK', '01-6315.3SK-2', '01-6358.5SK', '01-6358.5SK-2') THEN 'Stainless Steel'
        WHEN "productCode" LIKE '01-63%' AND "productCode" NOT LIKE '%-D' THEN 'Zinc Plated'
        WHEN "productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Adhesives'
        WHEN "productCode" IN ('01-7014', '01-7014-FBA') THEN 'Plastic'
        WHEN "productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'Zinc Plated'
        WHEN "productCode" LIKE '01-8003%' THEN 'Tools'
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
        WHEN "productCode" IN ('82-5002.K', '82-5002.010') OR "productCode" LIKE '82-6002%' OR "productCode" LIKE '01-8003%' THEN 'Adhesives'
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
           OR oi."productCode" LIKE '01-70%'
           OR oi."productCode" LIKE '01-8003%')
    AND o."orderDate" >= '${previousPeriodStart.toISOString()}'
    ${additionalFilters}
    GROUP BY 
      CASE 
        WHEN "productCode" LIKE '01-6310%' THEN 'SP10'
        WHEN "productCode" LIKE '01-6315%' THEN 'SP12'
        WHEN "productCode" LIKE '01-6318%' THEN 'SP18'
        WHEN "productCode" LIKE '01-6358%' THEN 'SP58'
        WHEN "productCode" IN ('82-5002.K', '82-5002.010') OR "productCode" LIKE '82-6002%' OR "productCode" LIKE '01-8003%' THEN 'Adhesives'
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
        { productCode: { startsWith: '01-8003' } }, // Caulk Gun for EPX3
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
    else if (['82-5002.K', '82-5002.010'].includes(product.productCode) || product.productCode.startsWith('82-6002') || product.productCode.startsWith('01-8003')) line = 'Adhesives'
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

// Get product reference and sales data for a specific company
export async function getCompanyProductReferenceAndSales(domain: string) {
  const results = await prisma.$queryRawUnsafe<Array<{
    product_line: string
    material_type: string
    productCode: string
    name: string | null
    description: string | null
    order_count: string
    total_units: string
    total_sales: string
    total_cost: string
    profit: string
  }>>(`
    SELECT 
      -- Product categorization
      CASE
        WHEN oi."productCode" LIKE '01-6310%' OR oi."productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'SP10'
        WHEN oi."productCode" LIKE '01-6315%' OR oi."productCode" IN ('01-6315.3SK', '01-6315.3SK-2') THEN 'SP12'
        WHEN oi."productCode" LIKE '01-6318%' OR oi."productCode" = '01-6318.7SK' THEN 'SP18'
        WHEN oi."productCode" LIKE '01-6358%' OR oi."productCode" IN ('01-6358.5SK', '01-6358.5SK-2') THEN 'SP58'
        WHEN oi."productCode" IN ('01-7014', '01-7014-FBA') THEN 'am625'
        WHEN oi."productCode" LIKE '01-8003%' OR oi."productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Adhesives'
        ELSE 'Other'
      END as product_line,
      
      -- Material type categorization
      CASE 
        WHEN oi."productCode" IN ('01-6318.7SK', '01-6315.3SK', '01-6315.3SK-2', '01-6358.5SK', '01-6358.5SK-2') THEN 'Stainless Steel'
        WHEN oi."productCode" LIKE '01-63%' AND oi."productCode" NOT LIKE '%-D' THEN 'Zinc Plated'
        WHEN oi."productCode" LIKE '%-D' THEN 'Dacromet'
        WHEN oi."productCode" IN ('82-5002.K', '82-5002.010', '82-6002') THEN 'Adhesives'
        WHEN oi."productCode" IN ('01-7014', '01-7014-FBA') THEN 'Plastic'
        WHEN oi."productCode" IN ('01-7011.PST', '01-7010-FBA', '01-7010', '01-7013') THEN 'Zinc Plated'
        WHEN oi."productCode" LIKE '01-8003%' THEN 'Tools'
        ELSE 'Other'
      END as material_type,
      
      -- Product details
      oi."productCode",
      p."name",
      p."description",
      
      -- Metrics
      COUNT(DISTINCT oi."orderId") as order_count,
      CAST(SUM(CAST(oi.quantity AS numeric) * COALESCE(p."unitsPerPackage", 6)) AS text) as total_units,
      CAST(SUM(oi.amount) AS text) as total_sales,
      
      -- Cost and profit calculations
      CAST(SUM(CAST(oi.quantity AS numeric) * COALESCE(p."cost", 0)) AS text) as total_cost,
      CAST(
        CASE 
          WHEN SUM(
            CASE 
              WHEN LOWER(oi.description) LIKE '%shipping%' OR LOWER(oi.description) LIKE '%freight%' OR 
                   LOWER(p.name) LIKE '%shipping%' OR LOWER(p.name) LIKE '%freight%' 
              THEN 0 
              ELSE oi.amount 
            END
          ) > 0 
          THEN 
            ((SUM(
              CASE 
                WHEN LOWER(oi.description) LIKE '%shipping%' OR LOWER(oi.description) LIKE '%freight%' OR 
                     LOWER(p.name) LIKE '%shipping%' OR LOWER(p.name) LIKE '%freight%' 
                THEN 0 
                ELSE oi.amount 
              END
            ) - SUM(CAST(oi.quantity AS numeric) * COALESCE(p."cost", 0))) / 
            SUM(
              CASE 
                WHEN LOWER(oi.description) LIKE '%shipping%' OR LOWER(oi.description) LIKE '%freight%' OR 
                     LOWER(p.name) LIKE '%shipping%' OR LOWER(p.name) LIKE '%freight%' 
                THEN 0 
                ELSE oi.amount 
              END
            ) * 100)
          ELSE 0
        END
        AS text) as profit
      
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    JOIN "Customer" c ON c."id" = o."customerId"
    JOIN "Company" comp ON comp."domain" = c."companyDomain"
    LEFT JOIN "Product" p ON p."productCode" = oi."productCode"
    
    WHERE comp."domain" = $1
    AND (oi."productCode" LIKE '01-63%'
         OR oi."productCode" LIKE '01-70%'
         OR oi."productCode" LIKE '01-8003%'
         OR oi."productCode" IN ('82-5002.K', '82-5002.010', '82-6002'))
    
    GROUP BY 
      product_line,
      material_type,
      oi."productCode",
      p."name",
      p."description"
    
    HAVING SUM(oi.amount) > 0
    
    ORDER BY 
      total_sales DESC
  `, domain)

  return results
}
