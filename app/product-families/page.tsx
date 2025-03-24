import { db } from "../../db";
import { sql } from "drizzle-orm";
import { orderItems, orders } from "../../db/schema";
import Link from "next/link";
import { getDateRangeFromTimeFrame } from "../utils/dates";

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
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Define product family information
const productFamilies = [
  {
    id: "sp10",
    name: "SP10 Asphalt Anchors",
    description: "6-inch asphalt anchors with various thread sizes and coatings",
    pattern: "01-6310%",
    image: "/sp10-family.jpg", // Placeholder - would need to add actual image
  },
  {
    id: "sp12",
    name: "SP12 Asphalt Anchors",
    description: "8-inch asphalt anchors with various thread sizes and coatings",
    pattern: "01-6315%",
    image: "/sp12-family.jpg", // Placeholder
  },
  {
    id: "sp18",
    name: "SP18 Asphalt Anchors",
    description: "10-inch asphalt anchors with various thread sizes and coatings",
    pattern: "01-6318%",
    image: "/sp18-family.jpg", // Placeholder
  },
  {
    id: "sp58",
    name: "SP58 Asphalt Anchors",
    description: "Heavy-duty 10-inch asphalt anchors with 5/8\" or M16 thread",
    pattern: "01-6358%",
    image: "/sp58-family.jpg", // Placeholder
  },
  {
    id: "am625",
    name: "AM625 Asphalt Anchors",
    description: "Plastic asphalt anchors for lighter applications",
    pattern: "01-7625%",
    image: "/am625-family.jpg", // Placeholder
  },
  {
    id: "epx",
    name: "EPX Anchoring Grouts",
    description: "Various epoxy and cement-based anchoring grouts",
    pattern: "82-%",
    image: "/epx-family.jpg", // Placeholder
  },
];

export default async function ProductFamilies({
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

  // For each family, get the count of products and total sales
  const familyStats = await Promise.all(
    productFamilies.map(async (family) => {
      // Get product count and total sales for this family
      // Strip the " IN" suffix from product codes when counting distinct products
      const statsResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT REGEXP_REPLACE(oi.product_code, ' IN$', '')) as product_count,
          SUM(oi.line_amount) as total_sales,
          SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity
        FROM order_items oi
        JOIN orders o ON oi.order_number = o.order_number
        WHERE oi.product_code LIKE ${family.pattern}
        AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
      `);
      
      const stats = Array.isArray(statsResult) && statsResult.length > 0
        ? {
            productCount: Number(statsResult[0].product_count || 0),
            totalSales: Number(statsResult[0].total_sales || 0),
            totalQuantity: Number(statsResult[0].total_quantity || 0)
          }
        : { productCount: 0, totalSales: 0, totalQuantity: 0 };
      
      // Get top selling product in this family
      // Strip the " IN" suffix from product codes when grouping
      const topProductResult = await db.execute(sql`
        SELECT 
          REGEXP_REPLACE(oi.product_code, ' IN$', '') as product_code,
          oi.product_description,
          SUM(oi.line_amount) as total_sales
        FROM order_items oi
        JOIN orders o ON oi.order_number = o.order_number
        WHERE oi.product_code LIKE ${family.pattern}
        AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
        GROUP BY REGEXP_REPLACE(oi.product_code, ' IN$', ''), oi.product_description
        ORDER BY total_sales DESC
        LIMIT 1
      `);
      
      const topProduct = Array.isArray(topProductResult) && topProductResult.length > 0 
        ? topProductResult[0] 
        : null;
      
      // Get all products in this family
      // Strip the " IN" suffix from product codes when grouping
      const products = await db.execute(sql`
        SELECT
          REGEXP_REPLACE(oi.product_code, ' IN$', '') as product_code,
          oi.product_description,
          SUM(oi.line_amount) as total_sales,
          SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity
        FROM order_items oi
        JOIN orders o ON oi.order_number = o.order_number
        WHERE oi.product_code LIKE ${family.pattern}
        AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
        GROUP BY REGEXP_REPLACE(oi.product_code, ' IN$', ''), oi.product_description
        ORDER BY total_sales DESC
      `);
      
      return {
        ...family,
        stats,
        topProduct,
        products,
      };
    })
  );

  // Calculate total revenue across all families
  const totalRevenue = familyStats.reduce((sum, family) => sum + family.stats.totalSales, 0);
  
  // Sort families by revenue for the selected period
  const sortedFamilies = [...familyStats].sort((a, b) => b.stats.totalSales - a.stats.totalSales);

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
              {/* Summary Cards */}
              <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3 @5xl/main:grid-cols-3">
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Total Product Families</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {productFamilies.length}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Active product families
                    </div>
                    <div className="text-muted-foreground">
                      {displayText}
                    </div>
                  </CardFooter>
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      ${Number(totalRevenue).toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Across all product families
                    </div>
                    <div className="text-muted-foreground">
                      {displayText}
                    </div>
                  </CardFooter>
                </Card>
                
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Top Performing Family</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {sortedFamilies[0]?.name.split(' ')[0] || 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      ${Number(sortedFamilies[0]?.stats.totalSales || 0).toLocaleString()} in revenue
                    </div>
                    <div className="text-muted-foreground">
                      {displayText}
                    </div>
                  </CardFooter>
                </Card>
              </div>
              
              {/* Product Family Cards */}
              <div className="px-4 lg:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {familyStats.map((family) => (
                    <Card key={family.id} className="overflow-hidden">
                      <CardHeader>
                        <CardTitle className="text-xl">{family.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{family.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Products</p>
                            <p className="text-lg font-medium mt-1">{family.stats.productCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue</p>
                            <p className="text-lg font-medium mt-1">${Number(family.stats.totalSales).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Units</p>
                            <p className="text-lg font-medium mt-1">{Number(family.stats.totalQuantity).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        {family.topProduct && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-medium mb-2">Top Product</h4>
                            <div className="text-sm">
                              <p className="font-medium">{family.topProduct.product_code}</p>
                              <p className="text-muted-foreground truncate">{family.topProduct.product_description}</p>
                              <Badge className="mt-1" variant="outline">
                                ${Number(family.topProduct.total_sales).toLocaleString()}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="bg-muted/50 flex justify-between">
                        <Link 
                          href={`/product-families/${family.id}?range=${range}`} 
                          passHref
                        >
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </Link>
                        <Link 
                          href={`/products?range=${range}&family=${family.id}`} 
                          passHref
                        >
                          <Button variant="outline" size="sm">
                            View Products
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}