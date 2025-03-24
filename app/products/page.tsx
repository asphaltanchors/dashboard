import { db } from "../../db";
import { sql } from "drizzle-orm";
import { products, orderItems, orders } from "../../db/schema";
import Link from "next/link";
import { getDateRangeFromTimeFrame } from "../utils/dates";

import { IconTrendingUp } from "@tabler/icons-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function ProductsAnalytics({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Get the selected range from URL params or default to last-12-months
  const params = await searchParams || {};
  const range = (params.range as string) || 'last-12-months';
  
  // Calculate date range based on the selected range
  const {
    startDate,
    endDate,
    formattedStartDate,
    formattedEndDate,
    displayText
  } = getDateRangeFromTimeFrame(range);
  
  // Calculate dates for time-based queries
  const last30DaysDate = new Date(endDate);
  last30DaysDate.setDate(endDate.getDate() - 30);
  
  const last90DaysDate = new Date(endDate);
  last90DaysDate.setDate(endDate.getDate() - 90);
  
  const formattedLast30Days = last30DaysDate.toISOString().split('T')[0];
  const formattedLast90Days = last90DaysDate.toISOString().split('T')[0];

  // Query to get total number of products
  const totalProductsResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(products);
  
  const totalProducts = totalProductsResult[0]?.count || 0;

  // Query to get products with missing descriptions
  const missingDescriptionsResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(products)
  .where(sql`sales_description = '' OR sales_description IS NULL`);
  
  const missingDescriptions = missingDescriptionsResult[0]?.count || 0;

  // Query to get top selling products by quantity
  const topSellingProducts = await db.select({
    productCode: orderItems.productCode,
    productDescription: orderItems.productDescription,
    totalQuantity: sql<number>`SUM(CAST(quantity AS NUMERIC))`.as('total_quantity'),
    totalRevenue: sql<number>`SUM(line_amount)`.as('total_revenue')
  })
  .from(orderItems)
  .innerJoin(
    sql`orders`,
    sql`orders.order_number = ${orderItems.orderNumber}`
  )
  .where(sql`quantity IS NOT NULL AND CAST(quantity AS NUMERIC) > 0 AND orders.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderItems.productCode, orderItems.productDescription)
  .orderBy(sql`total_quantity DESC`)
  .limit(10);

  // Define types for our custom queries
  type GrowingProduct = {
    product_code: string;
    product_description: string;
    current_quantity: number;
    previous_quantity: number | null;
    current_revenue: number;
    previous_revenue: number | null;
    growth_percent: number;
  };

  type AvgProductsResult = {
    avg_products: number;
  };

  // Query to get products with fastest growing sales (comparing last 30 days vs previous 30 days)
  const growingProductsResult = await db.execute(sql`
    WITH last_30_days AS (
      SELECT 
        oi.product_code,
        oi.product_description,
        SUM(CAST(oi.quantity AS NUMERIC)) as quantity,
        SUM(oi.line_amount) as revenue
      FROM order_items oi
      JOIN orders o ON o.order_number = oi.order_number
      WHERE o.order_date >= ${formattedLast30Days}
      GROUP BY oi.product_code, oi.product_description
    ),
    previous_30_days AS (
      SELECT 
        oi.product_code,
        SUM(CAST(oi.quantity AS NUMERIC)) as quantity,
        SUM(oi.line_amount) as revenue
      FROM order_items oi
      JOIN orders o ON o.order_number = oi.order_number
      WHERE o.order_date >= ${formattedLast90Days} AND o.order_date < ${formattedLast30Days}
      GROUP BY oi.product_code
    )
    SELECT 
      l.product_code,
      l.product_description,
      l.quantity as current_quantity,
      p.quantity as previous_quantity,
      l.revenue as current_revenue,
      p.revenue as previous_revenue,
      CASE 
        WHEN p.quantity = 0 OR p.quantity IS NULL THEN 100
        ELSE ROUND((l.quantity - p.quantity) / p.quantity * 100, 1)
      END as growth_percent
    FROM last_30_days l
    LEFT JOIN previous_30_days p ON l.product_code = p.product_code
    WHERE l.quantity > 0 AND (p.quantity = 0 OR p.quantity IS NULL OR l.quantity > p.quantity)
    ORDER BY growth_percent DESC, l.quantity DESC
    LIMIT 5
  `);
  
  // Cast the result to our type using double assertion
  const growingProducts = growingProductsResult as unknown as GrowingProduct[];
  
  // Query to get average products per order
  const avgProductsPerOrderResult = await db.execute(sql`
    SELECT AVG(product_count) as avg_products
    FROM (
      SELECT order_id, COUNT(*) as product_count
      FROM order_items
      GROUP BY order_id
    ) as order_counts
  `);
  
  // Cast the result to our type using double assertion
  const avgProductsPerOrder = avgProductsPerOrderResult as unknown as AvgProductsResult[];
  
  
  // Query to get all products that had sales with total sales amount
  const productsWithSales = await db.select({
    productCode: orderItems.productCode,
    productDescription: orderItems.productDescription,
    totalSales: sql<number>`SUM(line_amount)`.as('total_sales')
  })
  .from(orderItems)
  .innerJoin(
    sql`orders`,
    sql`orders.order_number = ${orderItems.orderNumber}`
  )
  .where(sql`product_code IS NOT NULL AND orders.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`)
  .groupBy(orderItems.productCode, orderItems.productDescription)
  .orderBy(sql`total_sales DESC`);

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
                    <CardDescription>Total Products</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {totalProducts.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Active product catalog
                    </div>
                    <div className="text-muted-foreground">
                      {displayText}
                    </div>
                  </CardFooter>
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Missing Descriptions</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {missingDescriptions.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        {((missingDescriptions / totalProducts) * 100).toFixed(1)}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Products need descriptions
                    </div>
                    <div className="text-muted-foreground">
                      Improve product data quality
                    </div>
                  </CardFooter>
                </Card>
                
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
              
              {/* Top Selling Products and Growing Products */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>{displayText}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topSellingProducts.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Link 
                                href={`/products/${encodeURIComponent(product.productCode || '')}`}
                                className="font-medium hover:underline"
                              >
                                {product.productCode}
                              </Link>
                              <div className="text-sm text-muted-foreground truncate max-w-72">{product.productDescription}</div>
                            </TableCell>
                            <TableCell className="text-right">{Number(product.totalQuantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">${Number(product.totalRevenue).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Fastest Growing Products</CardTitle>
                    <CardDescription>Last 30 Days vs Previous 30 Days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Growth</TableHead>
                          <TableHead className="text-right">Current</TableHead>
                          <TableHead className="text-right">Previous</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {growingProducts.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Link 
                                href={`/products/${encodeURIComponent(product.product_code || '')}`}
                                className="font-medium hover:underline"
                              >
                                {product.product_code}
                              </Link>
                              <div className="text-sm text-muted-foreground truncate max-w-72">{product.product_description}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="success">+{product.growth_percent}%</Badge>
                            </TableCell>
                            <TableCell className="text-right">{Number(product.current_quantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{Number(product.previous_quantity || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Total Sales</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsWithSales.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {product.productCode ? (
                                <Link 
                                  href={`/products/${encodeURIComponent(product.productCode)}`} 
                                  className="font-medium hover:underline"
                                >
                                  {product.productCode}
                                </Link>
                              ) : (
                                <span>Unknown</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-96">{product.productDescription}</TableCell>
                            <TableCell className="text-right">${Number(product.totalSales).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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