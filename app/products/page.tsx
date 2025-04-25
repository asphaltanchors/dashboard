import { db } from "../../db";
import { sql } from "drizzle-orm";
import { productsInAnalytics, orderItemsInAnalytics } from "../../db/schema";
import { getDateRangeFromTimeFrame } from "../utils/dates";

import { SearchableProductsTable } from "../components/SearchableProductsTable";
import { MaterialPieChart } from "../components/MaterialPieChart";
import { ProductLinePerformanceChart } from "../components/ProductLinePerformanceChart";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// Define the Product type to match the SearchableProductsTable component
type Product = {
  productCode: string | null;
  productDescription: string | null;
  totalProductsSold: number;
  totalSales: number;
  productFamily?: string | null;
  materialType?: string | null;
  orderCount?: number;
};

export default async function ProductsAnalytics(
  props: {
    searchParams: Promise<{ 
      range?: string | string[];
      family?: string | string[];
    }>
  }
) {
  // Get the selected range from URL params or default to last-12-months
  const searchParams = await props.searchParams;
  const params = searchParams || {};
  const range = (params.range as string) || 'last-12-months';
  
  // Calculate date range based on the selected range
  const {
    formattedStartDate,
    formattedEndDate,
    displayText
  } = getDateRangeFromTimeFrame(range);
  
  // Query to get total number of products
  await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(productsInAnalytics);

  // Query to get top selling products by quantity
  const topSellingProducts = await db.select({
    productCode: orderItemsInAnalytics.productCode,
    productDescription: orderItemsInAnalytics.productDescription,
    totalQuantity: sql<number>`SUM(CAST(quantity AS NUMERIC))`.as('total_quantity'),
    totalRevenue: sql<number>`SUM(line_amount)`.as('total_revenue')
  })
  .from(orderItemsInAnalytics)
  .innerJoin(
    sql`analytics.orders`,
    sql`analytics.orders.order_number = ${orderItemsInAnalytics.orderNumber}`
  )
  .where(sql`quantity IS NOT NULL AND CAST(quantity AS NUMERIC) > 0 AND analytics.orders.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderItemsInAnalytics.productCode, orderItemsInAnalytics.productDescription)
  .orderBy(sql`total_quantity DESC`)
  .limit(10);

  // Define types for our custom queries
  type AvgProductsResult = {
    avg_products: number;
  };

  // Query to get average products per order
  const avgProductsPerOrderResult = await db.execute(sql`
    SELECT AVG(product_count) as avg_products
    FROM (
      SELECT order_id, COUNT(*) as product_count
      FROM analytics.order_items
      GROUP BY order_id
    ) as order_counts
  `);
  
  // Cast the result to our type using double assertion
  const avgProductsPerOrder = avgProductsPerOrderResult as unknown as AvgProductsResult[];
  
  // Query to get revenue by material type for the selected time period
  const revenueByMaterialResult = await db.execute(sql`
    SELECT 
      p.material_type,
      SUM(oi.line_amount) as total_revenue
    FROM analytics.order_items oi
    INNER JOIN analytics.orders o ON o.order_number = oi.order_number
    INNER JOIN analytics.products p ON p.item_name = oi.product_code
    WHERE 
      p.material_type IS NOT NULL 
      AND p.material_type <> '' 
      AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
    GROUP BY p.material_type
    ORDER BY total_revenue DESC
  `);
  
  // Define type for the result
  type MaterialRevenue = {
    material_type: string;
    total_revenue: number;
  };
  
  // Cast the result to our type
  const materialRevenues = revenueByMaterialResult as unknown as MaterialRevenue[];
  
  // Calculate total revenue for percentage calculation
  const totalRevenue = materialRevenues.reduce(
    (sum, item) => sum + Number(item.total_revenue), 
    0
  );
  
  // Format the material data for the pie chart
  const materialData = materialRevenues.map(item => ({
    material: item.material_type || 'Other',
    value: Number(item.total_revenue),
    percentage: totalRevenue > 0 
      ? Number(((Number(item.total_revenue) / totalRevenue) * 100).toFixed(1))
      : 0
  }));
  
  // Query to get product line performance data comparing current period to previous period
  const productLinePerformanceResult = await db.execute(sql`
    WITH date_ranges AS (
      SELECT 
        ${formattedStartDate}::date as current_start,
        ${formattedEndDate}::date as current_end,
        (${formattedStartDate}::date - (${formattedEndDate}::date - ${formattedStartDate}::date))::date as prev_start,
        (${formattedStartDate}::date - INTERVAL '1 day')::date as prev_end
    ),
    current_period AS (
      SELECT 
        COALESCE(p.product_family, 'Uncategorized') as product_line,
        SUM(oi.line_amount) as revenue
      FROM analytics.order_items oi
      INNER JOIN analytics.orders o ON o.order_number = oi.order_number
      LEFT JOIN analytics.products p ON p.item_name = oi.product_code
      CROSS JOIN date_ranges dr
      WHERE o.order_date BETWEEN dr.current_start AND dr.current_end
      GROUP BY COALESCE(p.product_family, 'Uncategorized')
    ),
    previous_period AS (
      SELECT 
        COALESCE(p.product_family, 'Uncategorized') as product_line,
        SUM(oi.line_amount) as revenue
      FROM analytics.order_items oi
      INNER JOIN analytics.orders o ON o.order_number = oi.order_number
      LEFT JOIN analytics.products p ON p.item_name = oi.product_code
      CROSS JOIN date_ranges dr
      WHERE o.order_date BETWEEN dr.prev_start AND dr.prev_end
      GROUP BY COALESCE(p.product_family, 'Uncategorized')
    )
    SELECT 
      cp.product_line as product,
      cp.revenue as current,
      COALESCE(pp.revenue, 0) as previous
    FROM current_period cp
    LEFT JOIN previous_period pp ON cp.product_line = pp.product_line
    ORDER BY current DESC
    LIMIT 10
  `);
  
  // Define type for the product line performance result
  type ProductLinePerformance = {
    product: string;
    current: number;
    previous: number;
  };
  
  // Cast the result to our type
  const productLinePerformanceData = productLinePerformanceResult as unknown as ProductLinePerformance[];
  
  // Query to get all products that had sales with total sales amount and total products sold
  // Now including product line, material type, and order count
  const productsWithSalesResult = await db.execute(sql`
    SELECT 
      oi.product_code as "productCode",
      oi.product_description as "productDescription",
      SUM(oi.line_amount) as "totalSales",
      SUM(CAST(oi.quantity AS NUMERIC) * COALESCE(p.item_quantity, 1)) as "totalProductsSold",
      p.product_family as "productFamily",
      p.material_type as "materialType",
      COUNT(DISTINCT oi.order_number) as "orderCount"
    FROM analytics.order_items oi
    INNER JOIN analytics.orders o ON o.order_number = oi.order_number
    LEFT JOIN analytics.products p ON p.item_name = oi.product_code
    WHERE 
      oi.product_code IS NOT NULL 
      AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
    GROUP BY oi.product_code, oi.product_description, p.product_family, p.material_type
    ORDER BY "totalSales" DESC
  `);
  
  // Cast the result to our Product type
  const productsWithSales = productsWithSalesResult as unknown as Product[];

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Key Metrics */}
              <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3 @5xl/main:grid-cols-4">
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Top Product Revenue</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {topSellingProducts.length > 0 ? (
                        `$${Number(topSellingProducts[0].totalRevenue).toLocaleString()}`
                      ) : (
                        "$0"
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {topSellingProducts.length > 0 ? topSellingProducts[0].productCode : 'N/A'}
                    </div>
                    <div className="text-muted-foreground">
                      {displayText}
                    </div>
                  </CardFooter>
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Avg Products Per Order</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {avgProductsPerOrder[0]?.avg_products ? Number(avgProductsPerOrder[0].avg_products).toFixed(2) : 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Items per order average
                    </div>
                    <div className="text-muted-foreground">
                      {displayText}
                    </div>
                  </CardFooter>
                </Card>
              </div>
              
              {/* Material Revenue Chart and Product Line Performance Chart */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 lg:px-6">
                <div className="md:col-span-1">
                  <MaterialPieChart 
                    materialData={materialData}
                    timeframe={displayText}
                  />
                </div>
                <div className="md:col-span-2">
                  <ProductLinePerformanceChart 
                    data={productLinePerformanceData}
                    description={`Revenue Comparison - ${displayText} vs Previous Period`}
                    dateRange={range.includes('days') ? `${range.replace('last-', '').replace('-days', '')}d` : '365d'}
                  />
                </div>
              </div>
              
              {/* All Products */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>All Products With Sales</CardTitle>
                      <CardDescription>{displayText}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SearchableProductsTable products={productsWithSales} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
