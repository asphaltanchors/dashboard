import { db } from "@/db"
import { sql } from "drizzle-orm"
import { ordersInAnalytics, orderCompanyViewInAnalytics, companiesInAnalytics, companyOrderMappingInAnalytics, orderItemsInAnalytics } from "@/db/schema"
import { desc, sum, count, and, gte, lte, or, ilike } from "drizzle-orm" // Import necessary Drizzle functions
import { getDateRangeFromTimeFrame, getPreviousDateRange } from "@/app/utils/dates" // Import getPreviousDateRange
import { formatCurrency } from "@/lib/utils" // Import formatCurrency function
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// Import the new components and their types
import SalesChannelTable, { SalesChannelMetric } from "@/app/components/SalesChannelTable"
import { PaginatedOrdersTable } from "@/app/components/PaginatedOrdersTable"

export default async function OrdersPage(
  props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  // Handle search params safely
  const range = searchParams?.range
    ? Array.isArray(searchParams.range)
      ? searchParams.range[0]
      : searchParams.range
    : "last-12-months"

  // Get pagination parameters
  const page = searchParams?.page 
    ? parseInt(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page) 
    : 1
  const pageSize = 25
  const offset = (page - 1) * pageSize

  // Get search query
  const searchQuery = searchParams?.search
    ? Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search
    : ""

  // Get filter
  const filter = searchParams?.filter
    ? Array.isArray(searchParams.filter) ? searchParams.filter[0] : searchParams.filter
    : ""

  // Get product search
  const productSearch = searchParams?.product
    ? Array.isArray(searchParams.product) ? searchParams.product[0] : searchParams.product
    : ""

  // Get custom date range if provided
  const startDateParam = searchParams?.startDate
    ? Array.isArray(searchParams.startDate) ? searchParams.startDate[0] : searchParams.startDate
    : ""

  const endDateParam = searchParams?.endDate
    ? Array.isArray(searchParams.endDate) ? searchParams.endDate[0] : searchParams.endDate
    : ""

  // Calculate date range based on the selected time frame
  const dateRange = getDateRangeFromTimeFrame(range)
  const { formattedStartDate, formattedEndDate, startDate, endDate } = dateRange // Destructure start/end dates

  // Calculate the previous date ranges for 3 additional periods
  const previousDateRange1 = getPreviousDateRange(startDate, endDate)
  const { formattedStartDate: prevFormattedStartDate1, formattedEndDate: prevFormattedEndDate1 } = previousDateRange1

  // Calculate 2nd previous period
  const previousDateRange2 = getPreviousDateRange(previousDateRange1.startDate, previousDateRange1.endDate)
  const { formattedStartDate: prevFormattedStartDate2, formattedEndDate: prevFormattedEndDate2 } = previousDateRange2

  // Calculate 3rd previous period
  const previousDateRange3 = getPreviousDateRange(previousDateRange2.startDate, previousDateRange2.endDate)
  const { formattedStartDate: prevFormattedStartDate3, formattedEndDate: prevFormattedEndDate3 } = previousDateRange3

  // Query to get total number of orders and revenue for the selected time frame
  const orderSummaryResultPromise = db
    .select({
      totalOrders: sql<number>`count(*)`.as("total_orders"),
      totalRevenue: sql<number>`SUM(total_amount)`.as("total_revenue"),
      avgOrderValue: sql<number>`AVG(total_amount)`.as("avg_order_value"),
    })
    .from(ordersInAnalytics)
    .where(
      // Use Drizzle's 'and', 'gte', 'lte' for type safety if possible, or stick to sql``
      and(
        gte(ordersInAnalytics.orderDate, formattedStartDate),
        lte(ordersInAnalytics.orderDate, formattedEndDate)
      )
      // sql`order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )

  // Query to get previous period's revenue for comparison
  const previousPeriodRevenuePromise = db
    .select({
      totalRevenue: sql<number>`SUM(total_amount)`.as("total_revenue"),
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, prevFormattedStartDate1),
        lte(ordersInAnalytics.orderDate, prevFormattedEndDate1)
      )
    )

  // Removed orders by status and payment method queries

  // Query to get accounts receivable (sum of non-paid invoices)
  const accountsReceivablePromise = db
    .select({
      totalUnpaid: sql<number>`SUM(total_amount)`.as("total_unpaid"),
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, formattedStartDate),
        lte(ordersInAnalytics.orderDate, formattedEndDate),
        sql`${ordersInAnalytics.status} != 'Paid' AND ${ordersInAnalytics.status} != 'Closed'` // Exclude both Paid and Closed orders
      )
    )

  // Query to get previous period's accounts receivable for comparison
  const previousPeriodARPromise = db
    .select({
      totalUnpaid: sql<number>`SUM(total_amount)`.as("total_unpaid"),
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, prevFormattedStartDate1),
        lte(ordersInAnalytics.orderDate, prevFormattedEndDate1),
        sql`${ordersInAnalytics.status} != 'Paid' AND ${ordersInAnalytics.status} != 'Closed'` // Exclude both Paid and Closed orders
      )
    )

  // Use custom date range if provided, otherwise use the calculated date range
  const effectiveStartDate = startDateParam || formattedStartDate
  const effectiveEndDate = endDateParam || formattedEndDate

  // Build the base filter conditions
  const baseConditions = [
    gte(orderCompanyViewInAnalytics.orderDate, effectiveStartDate),
    lte(orderCompanyViewInAnalytics.orderDate, effectiveEndDate),
    // Add search conditions if search query is provided
    searchQuery
      ? or(
          ilike(orderCompanyViewInAnalytics.orderNumber, `%${searchQuery}%`),
          ilike(orderCompanyViewInAnalytics.customerName, `%${searchQuery}%`)
        )
      : undefined
  ];

  // Add filter-specific conditions
  if (filter === "ar") {
    // For Accounts Receivable, we want orders that are not Paid or Closed
    baseConditions.push(
      sql`EXISTS (
        SELECT 1 FROM analytics.orders o 
        WHERE o.order_number = ${orderCompanyViewInAnalytics.orderNumber} 
        AND o.status != 'Paid' 
        AND o.status != 'Closed'
      )`
    );
  }

  // Create a subquery for product filtering if a product search is provided
  let productFilterSubquery = undefined
  if (productSearch) {
    productFilterSubquery = sql`EXISTS (
      SELECT 1 FROM analytics.order_items oi 
      WHERE oi.order_number = ${orderCompanyViewInAnalytics.orderNumber}
      AND (
        oi.product_code ILIKE ${`%${productSearch}%`} OR 
        oi.product_description ILIKE ${`%${productSearch}%`}
      )
    )`
    baseConditions.push(productFilterSubquery)
  }

  // Query to get total count of orders for pagination
  const totalOrdersCountPromise = db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(orderCompanyViewInAnalytics)
    .where(and(...baseConditions.filter(Boolean)))

  // Query to get paginated orders list with company information
  const paginatedOrdersListPromise = db
    .select({
      orderNumber: orderCompanyViewInAnalytics.orderNumber,
      customerName: orderCompanyViewInAnalytics.customerName,
      orderDate: orderCompanyViewInAnalytics.orderDate,
      totalAmount: orderCompanyViewInAnalytics.totalAmount,
      companyName: orderCompanyViewInAnalytics.companyName,
      companyDomain: orderCompanyViewInAnalytics.companyDomain,
      companyId: orderCompanyViewInAnalytics.companyId,
      matchType: orderCompanyViewInAnalytics.matchType,
      confidence: orderCompanyViewInAnalytics.confidence,
    })
    .from(orderCompanyViewInAnalytics)
    .where(and(...baseConditions.filter(Boolean)))
    .orderBy(desc(orderCompanyViewInAnalytics.orderDate))
    .limit(pageSize)
    .offset(offset)

  // --- NEW: Query for Sales Channel Metrics (Current Period) ---
  // Using class from ordersInAnalytics as the sales channel
  const currentSalesChannelMetricsPromise = db
    .select({
      sales_channel: ordersInAnalytics.class, // Using class as the channel
      total_revenue: sum(ordersInAnalytics.totalAmount).mapWith(String), // Use total_amount for revenue
      order_count: count(ordersInAnalytics.orderNumber).mapWith(String), // Count orders
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, formattedStartDate),
        lte(ordersInAnalytics.orderDate, formattedEndDate),
        // Filter out null class values
        sql`${ordersInAnalytics.class} IS NOT NULL`
      )
    )
    .groupBy(ordersInAnalytics.class)

  // --- Query for Sales Channel Metrics (Previous Periods) ---
  const previousSalesChannelMetricsPromise1 = db
    .select({
      sales_channel: ordersInAnalytics.class,
      total_revenue: sum(ordersInAnalytics.totalAmount).mapWith(String),
      order_count: count(ordersInAnalytics.orderNumber).mapWith(String),
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, prevFormattedStartDate1),
        lte(ordersInAnalytics.orderDate, prevFormattedEndDate1),
        sql`${ordersInAnalytics.class} IS NOT NULL`
      )
    )
    .groupBy(ordersInAnalytics.class)

  // Query for 2nd previous period
  const previousSalesChannelMetricsPromise2 = db
    .select({
      sales_channel: ordersInAnalytics.class,
      total_revenue: sum(ordersInAnalytics.totalAmount).mapWith(String),
      order_count: count(ordersInAnalytics.orderNumber).mapWith(String),
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, prevFormattedStartDate2),
        lte(ordersInAnalytics.orderDate, prevFormattedEndDate2),
        sql`${ordersInAnalytics.class} IS NOT NULL`
      )
    )
    .groupBy(ordersInAnalytics.class)

  // Query for 3rd previous period
  const previousSalesChannelMetricsPromise3 = db
    .select({
      sales_channel: ordersInAnalytics.class,
      total_revenue: sum(ordersInAnalytics.totalAmount).mapWith(String),
      order_count: count(ordersInAnalytics.orderNumber).mapWith(String),
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, prevFormattedStartDate3),
        lte(ordersInAnalytics.orderDate, prevFormattedEndDate3),
        sql`${ordersInAnalytics.class} IS NOT NULL`
      )
    )
    .groupBy(ordersInAnalytics.class)


  // Helper function to join all data fetching promises and render UI
  async function OrdersPageContent() {
    // Wait for all data to be fetched in parallel
    const [
      orderSummaryResult,
      paginatedOrdersList,
      totalOrdersCount,
      currentSalesChannelMetrics,
      previousSalesChannelMetrics1,
      previousSalesChannelMetrics2,
      previousSalesChannelMetrics3,
      accountsReceivable, // Add accounts receivable result
      previousPeriodRevenue, // Previous period revenue
      previousPeriodAR // Previous period accounts receivable
    ] = await Promise.all([
      orderSummaryResultPromise,
      paginatedOrdersListPromise,
      totalOrdersCountPromise,
      currentSalesChannelMetricsPromise,
      previousSalesChannelMetricsPromise1,
      previousSalesChannelMetricsPromise2,
      previousSalesChannelMetricsPromise3,
      accountsReceivablePromise,
      previousPeriodRevenuePromise,
      previousPeriodARPromise
    ])

    // --- NEW: Combine Sales Channel Metrics ---
    const combinedMetrics: { [key: string]: SalesChannelMetric } = {};

    // Process current period data
    currentSalesChannelMetrics.forEach(metric => {
      if (!metric.sales_channel) return; // Skip null channels
      combinedMetrics[metric.sales_channel] = {
        sales_channel: metric.sales_channel,
        periods: [{
          period_start: formattedStartDate,
          period_end: formattedEndDate,
          total_revenue: metric.total_revenue || "0",
          order_count: metric.order_count || "0",
        }]
      };
    });

    // Process previous periods data
    // First previous period
    previousSalesChannelMetrics1.forEach(metric => {
      if (!metric.sales_channel) return; // Skip null channels
      const periodData = {
        period_start: prevFormattedStartDate1,
        period_end: prevFormattedEndDate1,
        total_revenue: metric.total_revenue || "0",
        order_count: metric.order_count || "0",
      };
      if (combinedMetrics[metric.sales_channel]) {
        // Add to existing channel's periods array
        combinedMetrics[metric.sales_channel].periods.push(periodData);
      } else {
        // Channel exists only in previous period, create entry with empty current period
        combinedMetrics[metric.sales_channel] = {
          sales_channel: metric.sales_channel,
          periods: [
            { // Placeholder for current period
              period_start: formattedStartDate,
              period_end: formattedEndDate,
              total_revenue: "0",
              order_count: "0",
            },
            periodData // Previous period data
          ]
        };
      }
    });
    
    // Second previous period
    previousSalesChannelMetrics2.forEach(metric => {
      if (!metric.sales_channel) return; // Skip null channels
      const periodData = {
        period_start: prevFormattedStartDate2,
        period_end: prevFormattedEndDate2,
        total_revenue: metric.total_revenue || "0",
        order_count: metric.order_count || "0",
      };
      if (combinedMetrics[metric.sales_channel]) {
        // Add to existing channel's periods array
        combinedMetrics[metric.sales_channel].periods.push(periodData);
      } else {
        // Channel exists only in this period, create entry with empty periods for current and first previous
        combinedMetrics[metric.sales_channel] = {
          sales_channel: metric.sales_channel,
          periods: [
            { // Placeholder for current period
              period_start: formattedStartDate,
              period_end: formattedEndDate,
              total_revenue: "0",
              order_count: "0",
            },
            { // Placeholder for first previous period
              period_start: prevFormattedStartDate1,
              period_end: prevFormattedEndDate1,
              total_revenue: "0",
              order_count: "0",
            },
            periodData // Second previous period data
          ]
        };
      }
    });
    
    // Third previous period
    previousSalesChannelMetrics3.forEach(metric => {
      if (!metric.sales_channel) return; // Skip null channels
      const periodData = {
        period_start: prevFormattedStartDate3,
        period_end: prevFormattedEndDate3,
        total_revenue: metric.total_revenue || "0",
        order_count: metric.order_count || "0",
      };
      if (combinedMetrics[metric.sales_channel]) {
        // Add to existing channel's periods array
        combinedMetrics[metric.sales_channel].periods.push(periodData);
      } else {
        // Channel exists only in this period, create entry with empty periods for current and previous periods
        combinedMetrics[metric.sales_channel] = {
          sales_channel: metric.sales_channel,
          periods: [
            { // Placeholder for current period
              period_start: formattedStartDate,
              period_end: formattedEndDate,
              total_revenue: "0",
              order_count: "0",
            },
            { // Placeholder for first previous period
              period_start: prevFormattedStartDate1,
              period_end: prevFormattedEndDate1,
              total_revenue: "0",
              order_count: "0",
            },
            { // Placeholder for second previous period
              period_start: prevFormattedStartDate2,
              period_end: prevFormattedEndDate2,
              total_revenue: "0",
              order_count: "0",
            },
            periodData // Third previous period data
          ]
        };
      }
    });

    // Ensure all channels have entries for all periods (even if zero)
    Object.values(combinedMetrics).forEach(metric => {
      // Check if we need to add placeholders for missing periods
      const periodsNeeded = 4; // We want 4 total periods
      const existingPeriods = metric.periods.length;
      
      // Add placeholders for missing periods
      if (existingPeriods < periodsNeeded) {
        // Define all possible period ranges
        const allPeriods = [
          {
            period_start: formattedStartDate,
            period_end: formattedEndDate,
            label: "current"
          },
          {
            period_start: prevFormattedStartDate1,
            period_end: prevFormattedEndDate1,
            label: "prev1"
          },
          {
            period_start: prevFormattedStartDate2,
            period_end: prevFormattedEndDate2,
            label: "prev2"
          },
          {
            period_start: prevFormattedStartDate3,
            period_end: prevFormattedEndDate3,
            label: "prev3"
          }
        ];
        
        // Find which periods are missing
        const existingPeriodLabels = metric.periods.map(p => {
          // Determine which period this is based on start date
          for (const period of allPeriods) {
            if (p.period_start === period.period_start) {
              return period.label;
            }
          }
          return null;
        }).filter(Boolean);
        
        // Add missing periods
        allPeriods.forEach(period => {
          if (!existingPeriodLabels.includes(period.label)) {
            metric.periods.push({
              period_start: period.period_start,
              period_end: period.period_end,
              total_revenue: "0",
              order_count: "0",
            });
          }
        });
      }
      
      // Ensure periods are ordered: current, prev1, prev2, prev3
      metric.periods.sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());
    });

    const salesChannelMetrics: SalesChannelMetric[] = Object.values(combinedMetrics);
    // --- END NEW ---


    const totalOrders = orderSummaryResult[0]?.totalOrders || 0
    const totalRevenue = orderSummaryResult[0]?.totalRevenue || 0
    const avgOrderValue = orderSummaryResult[0]?.avgOrderValue || 0

    // Fetch status information directly from orders table for each order
    const orderStatusPromises = paginatedOrdersList.map(order =>
      db.select({ status: ordersInAnalytics.status })
        .from(ordersInAnalytics)
        .where(sql`${ordersInAnalytics.orderNumber} = ${order.orderNumber}`)
        .limit(1)
    )

    // Wait for all status queries to complete
    const orderStatuses = await Promise.all(orderStatusPromises)

    // Add status information to each order in the list
    const ordersWithStatus = paginatedOrdersList.map((order, index) => ({
      ...order,
      status: orderStatuses[index][0]?.status || null
    }))

    return (
      <>
        <div className="flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          <h2 className="text-lg font-medium">
            {dateRange.displayText}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 md:grid-cols-4">
          {/* Summary Cards ... */}
           <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {totalOrders.toLocaleString()}
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
                {formatCurrency(Number(totalRevenue))}
              </div>
              {previousPeriodRevenue[0]?.totalRevenue !== null && (
                <div className="mt-1 flex items-center text-sm">
                  {(() => {
                    const prevRevenue = Number(previousPeriodRevenue[0]?.totalRevenue || 0);
                    const currentRevenue = Number(totalRevenue || 0);
                    if (prevRevenue === 0) return null;
                    
                    const percentChange = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
                    const isPositive = percentChange >= 0;
                    
                    return (
                      <>
                        <span className={`mr-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '↑' : '↓'} {Math.abs(percentChange).toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">vs previous period</span>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Average Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(Number(avgOrderValue))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Accounts Receivable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(Number(accountsReceivable[0]?.totalUnpaid || 0))}
              </div>
              {previousPeriodAR[0]?.totalUnpaid !== null && (
                <div className="mt-1 flex items-center text-sm">
                  {(() => {
                    const prevAR = Number(previousPeriodAR[0]?.totalUnpaid || 0);
                    const currentAR = Number(accountsReceivable[0]?.totalUnpaid || 0);
                    if (prevAR === 0) return null;
                    
                    const percentChange = ((currentAR - prevAR) / prevAR) * 100;
                    // For AR, an increase is generally negative (more unpaid invoices)
                    const isPositive = percentChange <= 0;
                    
                    return (
                      <>
                        <span className={`mr-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '↓' : '↑'} {Math.abs(percentChange).toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">vs previous period</span>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- NEW: Render Sales Channel Table --- */}
        <div className="px-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Channel</CardTitle>
            </CardHeader>
            {/* Add overflow-x-auto here for scrolling */}
            <CardContent className="overflow-x-auto"> 
              {/* Pass the range prop */}
              <SalesChannelTable metrics={salesChannelMetrics} range={range} />
            </CardContent>
          </Card>
        </div>
        {/* --- END NEW --- */}


        {/* Removed Orders by Status and Payment Method cards */}

        <Card className="mx-6">
          {/* All Orders Table with Pagination */}
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
              <PaginatedOrdersTable
                orders={ordersWithStatus}
                totalOrders={totalOrdersCount[0]?.count || 0}
                currentPage={page}
                pageSize={pageSize}
                searchQuery={searchQuery}
                productSearch={productSearch}
                startDate={startDateParam}
                endDate={endDateParam}
                range={range}
                filter={filter}
              />
          </CardContent>
        </Card>
      </>
    )
  }

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
            <div className="flex flex-col gap-6 py-6">
              {/* OrdersPageContent is an async component, Next.js handles this */}
              <OrdersPageContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
