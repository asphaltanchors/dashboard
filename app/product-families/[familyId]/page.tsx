import { db } from "../../../db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { getDateRangeFromTimeFrame } from "../../utils/dates";

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
import { Separator } from "@/components/ui/separator";

// Product family details
const familyDetails = {
  "SP10": {
    id: "sp10",
    name: "SP10 Asphalt Anchors",
    description: "6-inch asphalt anchors with various thread sizes and coatings. The SP10 is our most popular anchor for light to medium-duty applications. Available with 3/8\", M8, or M10 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    image: "/sp10-family.jpg", // Placeholder
    features: [
      "6-inch length for secure anchoring in asphalt",
      "Available with 3/8\", M8, or M10 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 1,500 lbs in 3-inch thick asphalt",
      "Installs in minutes with common tools"
    ]
  },
  "SP12": {
    id: "sp12",
    name: "SP12 Asphalt Anchors",
    description: "8-inch asphalt anchors with various thread sizes and coatings. The SP12 provides increased holding power for medium-duty applications. Available with 3/8\" or M10 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    image: "/sp12-family.jpg", // Placeholder
    features: [
      "8-inch length for deeper anchoring in asphalt",
      "Available with 3/8\" or M10 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 2,000 lbs in 3-inch thick asphalt",
      "Ideal for medium-duty applications"
    ]
  },
  "SP18": {
    id: "sp18",
    name: "SP18 Asphalt Anchors",
    description: "10-inch asphalt anchors with various thread sizes and coatings. The SP18 is designed for heavy-duty applications requiring maximum holding power. Available with 7/16\" or M12 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    image: "/sp18-family.jpg", // Placeholder
    features: [
      "10-inch length for maximum anchoring depth",
      "Available with 7/16\" or M12 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 3,000 lbs in 3-inch thick asphalt",
      "Ideal for heavy-duty applications"
    ]
  },
  "SP58": {
    id: "sp58",
    name: "SP58 Asphalt Anchors",
    description: "Heavy-duty 10-inch asphalt anchors with 5/8\" or M16 thread. The SP58 is our strongest anchor, designed for the most demanding applications. Available with 5/8\" or M16 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    image: "/sp58-family.jpg", // Placeholder
    features: [
      "10-inch length with larger diameter for maximum strength",
      "Available with 5/8\" or M16 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 4,000 lbs in 3-inch thick asphalt",
      "Our strongest anchor for the most demanding applications"
    ]
  },
  "AM625": {
    id: "am625",
    name: "AM625 Asphalt Anchors",
    description: "Plastic asphalt anchors for lighter applications. The AM625 is a cost-effective solution for light-duty applications where metal anchors would be overkill. Made from high-strength engineering plastic with a 6\" length and 3/4\" diameter.",
    image: "/am625-family.jpg", // Placeholder
    features: [
      "6-inch length plastic anchor for light-duty applications",
      "Cost-effective alternative to metal anchors",
      "Corrosion-proof design",
      "Easy installation with common tools",
      "Ideal for temporary installations or lighter loads"
    ]
  },
  "Adhesives": {
    id: "adhesives",
    name: "Adhesives",
    description: "Various adhesives for different applications.",
    image: "/adhesives-family.jpg", // Placeholder
    features: [
      "High-strength epoxy adhesives",
      "Fast curing formulations",
      "Weather resistant options",
      "Industrial grade performance",
      "Various package sizes available"
    ]
  },
  "Kits": {
    id: "kits",
    name: "Installation Kits",
    description: "Complete kits for installation of various anchors.",
    image: "/kits-family.jpg", // Placeholder
    features: [
      "All-in-one installation packages",
      "Includes all necessary components",
      "Simple instructions included",
      "Available for various anchor types",
      "Professional grade tools and materials"
    ]
  }
};

export default async function ProductFamilyDetail(
  props: {
    params: Promise<{ familyId: string }>;
    searchParams: Promise<{ 
      range?: string | string[];
    }>
  }
) {
  // Get the familyId from params
  const params = await props.params;
  const familyId = params.familyId;
  
  // Get the selected range from URL params or default to last-12-months
  const searchParams = await props.searchParams;
  const queryParams = searchParams || {};
  const range = (queryParams.range as string) || 'last-12-months';
  
  // Calculate date range based on the selected range
  const {
    formattedStartDate,
    formattedEndDate,
    displayText
  } = getDateRangeFromTimeFrame(range);
  
  // Get family data from the database using the products table
  const familyResult = await db.execute(sql`
    SELECT product_family 
    FROM products 
    WHERE product_family IS NOT NULL AND LOWER(product_family) = LOWER(${familyId})
    LIMIT 1
  `);
  
  // Check if we found a matching family
  if (!familyResult.length) {
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
                <div className="px-4 lg:px-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Family Not Found</CardTitle>
                      <CardDescription>The requested product family could not be found</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>We couldn&apost find a product family with the ID: {familyId}</p>
                      <Button className="mt-4" asChild>
                        <Link href="/product-families">Back to Product Families</Link>
                      </Button>
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
  
  // Get the actual family ID from database
  const dbFamilyId = familyResult[0].product_family;
  
  // Find additional family details from our lookup or create default
  const family = familyDetails[dbFamilyId as keyof typeof familyDetails] || {
    id: familyId,
    name: dbFamilyId,
    description: `Products in the ${dbFamilyId} family`,
    image: "/default-family.jpg",
    features: ["No specific features available for this family"]
  };
  
  // Define types for our data
  type Product = {
    product_code: string;
    product_description: string;
    total_sales: number;
    total_quantity: number;
    order_count: number;
    avg_unit_price: number;
  };
  
  type MonthlySales = {
    month: string;
    total_sales: number;
    total_quantity: number;
  };
  
  type OrderData = {
    order_number: string;
    order_date: string;
    product_code: string;
    product_description: string;
    quantity: number;
    line_amount: number;
    customer_name: string;
  };

  // Get all products in this family with sales data using the products table
  const productsResult = await db.execute(sql`
    SELECT 
      REGEXP_REPLACE(oi.product_code, ' IN$', '') as product_code,
      oi.product_description,
      SUM(oi.line_amount) as total_sales,
      SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity,
      COUNT(DISTINCT oi.order_number) as order_count,
      AVG(oi.unit_price) as avg_unit_price
    FROM order_items oi
    JOIN orders o ON oi.order_number = o.order_number
    JOIN products p ON p.item_name = REGEXP_REPLACE(oi.product_code, ' IN$', '')
    WHERE p.product_family = ${dbFamilyId}
    AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
    GROUP BY REGEXP_REPLACE(oi.product_code, ' IN$', ''), oi.product_description
    ORDER BY total_sales DESC
  `);
  
  // Cast the result to our Product type
  const products = productsResult as unknown as Product[];
  
  // Get total stats for this family
  const statsResult = await db.execute(sql`
    SELECT 
      SUM(oi.line_amount) as total_sales,
      SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity,
      COUNT(DISTINCT oi.order_number) as order_count,
      COUNT(DISTINCT o.customer_name) as customer_count
    FROM order_items oi
    INNER JOIN orders o ON oi.order_number = o.order_number
    JOIN products p ON p.item_name = REGEXP_REPLACE(oi.product_code, ' IN$', '')
    WHERE p.product_family = ${dbFamilyId}
    AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
  `);
  
  const stats = Array.isArray(statsResult) && statsResult.length > 0
    ? {
        totalSales: Number(statsResult[0].total_sales || 0),
        totalQuantity: Number(statsResult[0].total_quantity || 0),
        orderCount: Number(statsResult[0].order_count || 0),
        customerCount: Number(statsResult[0].customer_count || 0)
      }
    : { 
        totalSales: 0, 
        totalQuantity: 0, 
        orderCount: 0, 
        customerCount: 0 
      };
  
  // Get monthly sales trend for this family
  const monthlySalesResult = await db.execute(sql`
    SELECT 
      TO_CHAR(o.order_date, 'YYYY-MM') as month,
      SUM(oi.line_amount) as total_sales,
      SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity
    FROM order_items oi
    INNER JOIN orders o ON oi.order_number = o.order_number
    JOIN products p ON p.item_name = REGEXP_REPLACE(oi.product_code, ' IN$', '')
    WHERE p.product_family = ${dbFamilyId}
    AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);
  
  // Cast the result to our type
  const monthlySales = monthlySalesResult as unknown as MonthlySales[];
  
  // Get recent orders for this family
  const recentOrdersResult = await db.execute(sql`
    SELECT 
      oi.order_number, 
      o.order_date,
      oi.product_code,
      oi.product_description,
      oi.quantity,
      oi.line_amount,
      o.customer_name
    FROM order_items oi
    INNER JOIN orders o ON oi.order_number = o.order_number
    JOIN products p ON p.item_name = REGEXP_REPLACE(oi.product_code, ' IN$', '')
    WHERE p.product_family = ${dbFamilyId}
    AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
    ORDER BY o.order_date DESC
    LIMIT 10
  `);
  
  // Cast the result to our OrderData type
  const recentOrders = recentOrdersResult as unknown as OrderData[];

  // Create URL back to product families with the same time frame
  const backToFamiliesUrl = `/product-families?range=${range}`;

  return (
    (<SidebarProvider
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
              {/* Back Button */}
              <div className="px-4 lg:px-6">
                <Button variant="outline" size="sm" asChild>
                  <Link href={backToFamiliesUrl}>
                    ← Back to Product Families
                  </Link>
                </Button>
              </div>
              
              {/* Family Overview Card */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{family.name}</CardTitle>
                    <CardDescription>{displayText}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{family.description}</p>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Key Features</h3>
                      <ul className="ml-5 space-y-1 list-disc text-muted-foreground">
                        {family.features.map((feature: string, index: number) => (
                          <li key={index}>{feature.replace(/'/g, "&apos;")}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="py-2">
                          <CardDescription>Total Sales</CardDescription>
                          <CardTitle>${Number(stats.totalSales).toLocaleString()}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="py-2">
                          <CardDescription>Units Sold</CardDescription>
                          <CardTitle>{Number(stats.totalQuantity).toLocaleString()}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="py-2">
                          <CardDescription>Orders</CardDescription>
                          <CardTitle>{Number(stats.orderCount).toLocaleString()}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="py-2">
                          <CardDescription>Customers</CardDescription>
                          <CardTitle>{Number(stats.customerCount).toLocaleString()}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Products and Monthly Sales */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Products in this Family</CardTitle>
                    <CardDescription>{products.length} products with sales</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Avg. Price</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(products) && products.map((product, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Link 
                                href={`/products/${encodeURIComponent(product.product_code || '')}?range=${range}`} 
                                className="font-medium hover:underline"
                              >
                                {product.product_code}
                              </Link>
                              <div className="text-sm text-muted-foreground truncate max-w-72">{product.product_description}</div>
                            </TableCell>
                            <TableCell className="text-right">${Number(product.avg_unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">{Number(product.total_quantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">${Number(product.total_sales).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        {(!Array.isArray(products) || products.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">No products found in this family</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Sales Trend</CardTitle>
                    <CardDescription>{displayText}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(monthlySales) && monthlySales.map((month: MonthlySales, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{month.month}</TableCell>
                            <TableCell className="text-right">{Number(month.total_quantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">${Number(month.total_sales || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        {monthlySales.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-4 text-center text-muted-foreground">No monthly sales data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              
              {/* Recent Orders */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Last {recentOrders.length} orders for this product family</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(recentOrders) && recentOrders.map((order: OrderData, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <Link href={`/orders/${String(order.order_number)}?range=${range}`} className="hover:underline">
                                {String(order.order_number)}
                              </Link>
                            </TableCell>
                            <TableCell>{order.order_date ? new Date(String(order.order_date)).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>{String(order.customer_name)}</TableCell>
                            <TableCell>
                              <div className="font-medium">{String(order.product_code)}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-56">{String(order.product_description)}</div>
                            </TableCell>
                            <TableCell className="text-right">{Number(order.quantity).toLocaleString()}</TableCell>
                            <TableCell className="text-right">${Number(order.line_amount).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        {recentOrders.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">No recent orders</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>)
  );
}
