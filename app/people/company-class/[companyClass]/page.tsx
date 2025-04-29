import { db } from "@/db";
import { sql, eq, desc } from "drizzle-orm";
import { ordersInAnalytics, customersInAnalytics, companiesInAnalytics } from "@/db/schema";
import { getDateRangeFromTimeFrame } from "@/app/utils/dates";
import { formatCurrency } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportCSVButton } from "@/components/export-csv-button";
import Link from "next/link";

// Define interface for the extras object
interface CompactExtras {
  c: string;  // Company class code
  a?: boolean; // AM625
  b?: boolean; // SP10
  s?: boolean; // SP12 (changed from c to s to avoid naming conflict)
  d?: boolean; // SP18
  e?: boolean; // SP58
}

// Map company classes to single letter codes for compact encoding
const companyClassToCode: Record<string, string> = {
  "AAG -- do not use": "a",
  "Amazon Combined:Amazon Direct": "b",
  "Contractor": "c",
  "Distributor": "d",
  "EXPORT": "e",
  "EXPORT from WWD": "f",
  "OEM": "g",
  "Unknown": "h",
  "consumer": "i",
  "eStore": "j"
};

export default async function PeopleCompanyClassPage(
  props: {
    params: Promise<{ companyClass: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const companyClassId = params.companyClass;
  const companyClassName = decodeURIComponent(companyClassId); // Decode the company class name from URL

  // Handle search params safely for date range
  const range = searchParams && searchParams.range
    ? Array.isArray(searchParams.range)
      ? searchParams.range[0]
      : searchParams.range
    : "last-12-months";

  // Calculate date ranges
  const dateRange = getDateRangeFromTimeFrame(range);
  const { displayText } = dateRange;

  // Query to get distinct email addresses from people who belong to companies with this class (no date filter)
  const peoplePromise = db
    .select({
      email: sql<string>`COALESCE(
        (SELECT email_address FROM analytics.customer_emails 
         WHERE customer_name = ${customersInAnalytics.customerName} 
         AND is_primary_email = true 
         LIMIT 1),
        ${customersInAnalytics.email}
      )`.mapWith(String),
      displayName: sql<string>`CASE 
        WHEN ${customersInAnalytics.firstName} IS NOT NULL AND ${customersInAnalytics.lastName} IS NOT NULL 
        THEN CONCAT(${customersInAnalytics.firstName}, ' ', ${customersInAnalytics.lastName})
        ELSE ${customersInAnalytics.customerName}
      END`.mapWith(String),
      companyName: companiesInAnalytics.companyName,
      companyId: customersInAnalytics.companyId, // Add company_id for product purchase lookup
      orderCount: sql<string>`COUNT(DISTINCT ${ordersInAnalytics.orderNumber})`.mapWith(String),
      totalSpent: sql<string>`SUM(${ordersInAnalytics.totalAmount})`.mapWith(String),
      lastOrderDate: sql<string>`MAX(${ordersInAnalytics.orderDate})`.mapWith(String),
    })
    .from(customersInAnalytics)
    .innerJoin(
      companiesInAnalytics,
      eq(customersInAnalytics.companyId, companiesInAnalytics.companyId)
    )
    .leftJoin(
      ordersInAnalytics,
      eq(customersInAnalytics.customerName, ordersInAnalytics.customerName)
    )
    .where(
      sql`${companiesInAnalytics.class} = ${companyClassName} AND COALESCE(
        (SELECT email_address FROM analytics.customer_emails 
         WHERE customer_name = ${customersInAnalytics.customerName} 
         AND is_primary_email = true 
         LIMIT 1),
        ${customersInAnalytics.email}
      ) IS NOT NULL`
    )
    .groupBy(
      sql`COALESCE(
        (SELECT email_address FROM analytics.customer_emails 
         WHERE customer_name = ${customersInAnalytics.customerName} 
         AND is_primary_email = true 
         LIMIT 1),
        ${customersInAnalytics.email}
      )`,
      sql`CASE 
        WHEN ${customersInAnalytics.firstName} IS NOT NULL AND ${customersInAnalytics.lastName} IS NOT NULL 
        THEN CONCAT(${customersInAnalytics.firstName}, ' ', ${customersInAnalytics.lastName})
        ELSE ${customersInAnalytics.customerName}
      END`,
      companiesInAnalytics.companyName,
      customersInAnalytics.companyId
    )
    .orderBy(desc(sql`SUM(${ordersInAnalytics.totalAmount})`));

  // Query to get summary metrics for this company class (no date filter)
  const companySummaryPromise = db
    .select({
      totalPeople: sql<number>`COUNT(DISTINCT ${customersInAnalytics.customerName})`,
      totalOrders: sql<number>`COUNT(${ordersInAnalytics.orderNumber})`,
      totalRevenue: sql<number>`SUM(${ordersInAnalytics.totalAmount})`,
      avgOrderValue: sql<number>`AVG(${ordersInAnalytics.totalAmount})`,
    })
    .from(customersInAnalytics)
    .innerJoin(
      companiesInAnalytics,
      eq(customersInAnalytics.companyId, companiesInAnalytics.companyId)
    )
    .leftJoin(
      ordersInAnalytics,
      eq(customersInAnalytics.customerName, ordersInAnalytics.customerName)
    )
    .where(
      eq(companiesInAnalytics.class, companyClassName)
    );

  // Query to get product purchase data for companies in this company class
  const productPurchasePromise = db.execute(sql`
    SELECT 
      c.company_id,
      BOOL_OR(p.product_family = 'AM625') as bought_am625,
      BOOL_OR(p.product_family = 'SP10') as bought_sp10,
      BOOL_OR(p.product_family = 'SP12') as bought_sp12,
      BOOL_OR(p.product_family = 'SP18') as bought_sp18,
      BOOL_OR(p.product_family = 'SP58') as bought_sp58
    FROM 
      analytics.customers c
      JOIN analytics.orders o ON c.customer_name = o.customer_name
      JOIN analytics.order_items oi ON o.order_number = oi.order_number
      JOIN analytics.products p ON REGEXP_REPLACE(oi.product_code, ' IN$', '') = p.item_name
      JOIN analytics.companies comp ON c.company_id = comp.company_id
    WHERE 
      comp.class = ${companyClassName}
      AND p.product_family IN ('AM625', 'SP10', 'SP12', 'SP18', 'SP58')
    GROUP BY 
      c.company_id
  `);

  // Wait for all promises
  const [people, companySummary, productPurchases] = await Promise.all([
    peoplePromise,
    companySummaryPromise,
    productPurchasePromise,
  ]);

  // Create a map of company_id to product purchases for easy lookup
  const companyProductMap = new Map();
  productPurchases.forEach((purchase: any) => {
    companyProductMap.set(purchase.company_id, {
      bought_am625: purchase.bought_am625 === true,
      bought_sp10: purchase.bought_sp10 === true,
      bought_sp12: purchase.bought_sp12 === true,
      bought_sp18: purchase.bought_sp18 === true,
      bought_sp58: purchase.bought_sp58 === true
    });
  });

  // Format data for CSV export
  const exportData = people.map(person => {
    // Get the company_id from the person object
    const companyId = person.companyId;
    
    // Get product purchase data for this company
    const productData = companyProductMap.get(companyId) || {
      bought_am625: false,
      bought_sp10: false,
      bought_sp12: false,
      bought_sp18: false,
      bought_sp58: false
    };
    
    // Create compact JSON extras
    const extras: CompactExtras = {
      c: companyClassToCode[companyClassName] || 'h', // Default to 'Unknown' if class not found
    };
    
    // Add product purchase flags (only if true)
    if (productData.bought_am625) extras.a = true;
    if (productData.bought_sp10) extras.b = true;
    if (productData.bought_sp12) extras.s = true; // Changed from c to s
    if (productData.bought_sp18) extras.d = true;
    if (productData.bought_sp58) extras.e = true;
    
    return {
      email: person.email,
      displayName: person.displayName,
      customerName: person.displayName,
      companyName: person.companyName,
      orderCount: person.orderCount,
      totalSpent: person.totalSpent,
      lastOrderDate: person.lastOrderDate,
      extras: JSON.stringify(extras)
    };
  });

  // Format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to format numbers
  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "0";
    return new Intl.NumberFormat("en-US").format(value);
  };

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
              {/* Header */}
              <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                  <h1 className="text-2xl font-bold">People: {companyClassName}</h1>
                  <p className="text-muted-foreground">
                    Customers associated with companies of class: {companyClassName}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <ExportCSVButton 
                    data={exportData.map(person => ({
                      email: person.email,
                      firstName: '',
                      lastName: '',
                      customerName: person.customerName,
                      orderCount: person.orderCount,
                      totalSpent: person.totalSpent,
                      lastOrderDate: person.lastOrderDate,
                      channel: companyClassName,
                      extras: person.extras // Pass the compact encoded extras
                    }))}
                    filename={`${companyClassName.toLowerCase().replace(/\s+/g, '-')}-customers.csv`}
                  />
                  <h2 className="text-lg font-medium">{displayText}</h2>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total People
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatNumber(companySummary[0]?.totalPeople || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatNumber(companySummary[0]?.totalOrders || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(Number(companySummary[0]?.totalRevenue || 0))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg. Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(Number(companySummary[0]?.avgOrderValue || 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* People Table */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>People</CardTitle>
                    <CardDescription>
                      Customers associated with companies of class: {companyClassName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-center">AM625</TableHead>
                          <TableHead className="text-center">SP10</TableHead>
                          <TableHead className="text-center">SP12</TableHead>
                          <TableHead className="text-center">SP18</TableHead>
                          <TableHead className="text-center">SP58</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Total Spent</TableHead>
                          <TableHead className="text-right">Last Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {people.map((person, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">
                                {person.email || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {person.displayName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {person.companyName || 'N/A'}
                            </TableCell>
                            {/* Product purchase indicators */}
                            <TableCell className="text-center">
                              {companyProductMap.get(person.companyId)?.bought_am625 ? '✓' : ''}
                            </TableCell>
                            <TableCell className="text-center">
                              {companyProductMap.get(person.companyId)?.bought_sp10 ? '✓' : ''}
                            </TableCell>
                            <TableCell className="text-center">
                              {companyProductMap.get(person.companyId)?.bought_sp12 ? '✓' : ''}
                            </TableCell>
                            <TableCell className="text-center">
                              {companyProductMap.get(person.companyId)?.bought_sp18 ? '✓' : ''}
                            </TableCell>
                            <TableCell className="text-center">
                              {companyProductMap.get(person.companyId)?.bought_sp58 ? '✓' : ''}
                            </TableCell>
                            <TableCell className="text-right">
                              {person.orderCount || '0'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(Number(person.totalSpent || 0))}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatDate(person.lastOrderDate || '')}
                            </TableCell>
                          </TableRow>
                        ))}
                        {people.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={12} className="text-center text-muted-foreground">
                              No people found for this company class
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Back Link */}
              <div className="px-4 lg:px-6">
                <Link 
                  href={`/people?range=${range}`}
                  className="text-primary hover:underline"
                >
                  ← Back to selectors
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
