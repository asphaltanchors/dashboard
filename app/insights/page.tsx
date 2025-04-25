import { db } from "@/db"
import { sql } from "drizzle-orm"
import { ordersInAnalytics } from "@/db/schema"
import { and, gte, lte, or, ne } from "drizzle-orm"
import { getDateRangeFromTimeFrame } from "@/app/utils/dates"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { IndustryChart, SourceChannelChart, RelationshipChart } from "@/app/components/InsightsCharts"

// Define types for our data
type IndustryData = {
  industry: string;
  count: number;
  percentage: number;
}

type SourceChannelData = {
  sourceChannel: string;
  count: number;
  percentage: number;
}

type IndustrySourceData = {
  industry: string;
  sourceChannel: string;
  count: number;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Wait for searchParams to be available
  const params = await searchParams || {};
  
  // Get range from URL params or default to last-12-months
  const range = (params.range as string) || 'last-12-months';
  const startDateParam = params.start as string | undefined;
  const endDateParam = params.end as string | undefined;
  
  // Calculate date range based on the selected range
  const dateRange = getDateRangeFromTimeFrame(range, startDateParam, endDateParam);
  const { formattedStartDate, formattedEndDate, displayText } = dateRange;

  // Helper function to normalize industry
  const normalizeIndustry = (industry: string): string => {
    if (!industry) return 'Other';
    
    const lowerIndustry = industry.toLowerCase();
    if (lowerIndustry.includes('homeowner') || lowerIndustry === 'home owner' || lowerIndustry === 'diy homeowner') {
      return 'Homeowner';
    } else if (lowerIndustry.includes('contractor') || lowerIndustry === 'general contractor') {
      return 'Contractor';
    } else if (lowerIndustry.includes('manufacturing') || lowerIndustry === 'manufacturer') {
      return 'Manufacturing';
    } else if (lowerIndustry.includes('construction')) {
      return 'Construction';
    } else if (lowerIndustry.includes('electrical contractor')) {
      return 'Electrical Contractor';
    } else {
      return 'Other';
    }
  };

  // Query to get all orders within the date range
  const ordersDataPromise = db
    .select({
      industry: ordersInAnalytics.industry,
      sourceChannel: ordersInAnalytics.sourcechannel,
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, formattedStartDate),
        lte(ordersInAnalytics.orderDate, formattedEndDate),
        or(
          ne(ordersInAnalytics.industry, ''),
          ne(ordersInAnalytics.sourcechannel, '')
        )
      )
    );

  // Query to get total orders count for percentage calculations
  const totalOrdersPromise = db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(ordersInAnalytics)
    .where(
      and(
        gte(ordersInAnalytics.orderDate, formattedStartDate),
        lte(ordersInAnalytics.orderDate, formattedEndDate)
      )
    );

  // Helper function to join all data fetching promises and render UI
  async function InsightsPageContent() {
    // Wait for all data to be fetched in parallel
    const [ordersData] = await Promise.all([
      ordersDataPromise,
      totalOrdersPromise
    ]);

    // Get total orders count for reference (not used in UI)
    // const totalOrdersCount = totalOrdersResult[0]?.count || 0;
    
    // Process industry data
    const industryMap = new Map<string, number>();
    // Track original industry values for detailed breakdown
    const originalIndustryMap = new Map<string, number>();
    
    ordersData.forEach(order => {
      if (!order.industry) return;
      
      // Store original industry value
      if (order.industry.trim()) {
        originalIndustryMap.set(order.industry, (originalIndustryMap.get(order.industry) || 0) + 1);
      }
      
      const normalizedIndustry = normalizeIndustry(order.industry);
      industryMap.set(normalizedIndustry, (industryMap.get(normalizedIndustry) || 0) + 1);
    });
    
    // Calculate total orders with industry data
    const totalIndustryOrders = Array.from(industryMap.values()).reduce((sum, count) => sum + count, 0);
    
    const industryData: IndustryData[] = Array.from(industryMap.entries())
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: (count / totalIndustryOrders) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    // Process source channel data
    const sourceChannelMap = new Map<string, number>();
    ordersData.forEach(order => {
      if (!order.sourceChannel) return;
      
      const channel = order.sourceChannel || 'Unknown';
      sourceChannelMap.set(channel, (sourceChannelMap.get(channel) || 0) + 1);
    });
    
    // Calculate total orders with source channel data
    const totalChannelOrders = Array.from(sourceChannelMap.values()).reduce((sum, count) => sum + count, 0);
    
    const sourceChannelData: SourceChannelData[] = Array.from(sourceChannelMap.entries())
      .map(([sourceChannel, count]) => ({
        sourceChannel,
        count,
        percentage: (count / totalChannelOrders) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    // Process industry-source relationship data
    const relationshipMap = new Map<string, Map<string, number>>();
    ordersData.forEach(order => {
      if (!order.industry || !order.sourceChannel) return;
      
      const normalizedIndustry = normalizeIndustry(order.industry);
      const channel = order.sourceChannel;
      
      if (!relationshipMap.has(normalizedIndustry)) {
        relationshipMap.set(normalizedIndustry, new Map<string, number>());
      }
      
      const industryMap = relationshipMap.get(normalizedIndustry)!;
      industryMap.set(channel, (industryMap.get(channel) || 0) + 1);
    });
    
    const industrySourceData: IndustrySourceData[] = [];
    relationshipMap.forEach((channelMap, industry) => {
      channelMap.forEach((count, sourceChannel) => {
        industrySourceData.push({
          industry,
          sourceChannel,
          count
        });
      });
    });

    // Prepare data for stacked bar chart
    const topIndustries = industryData.slice(0, 5).map(item => item.industry);
    const sourceChannels = Array.from(new Set(industrySourceData.map(item => item.sourceChannel)));
    
    const stackedBarData = topIndustries.map(industry => {
      const result: Record<string, string | number> = { industry };
      sourceChannels.forEach(channel => {
        const match = industrySourceData.find(item => 
          item.industry === industry && item.sourceChannel === channel
        );
        result[channel] = match ? match.count : 0;
      });
      return result;
    });
    
    // Prepare detailed industry breakdown (top 100)
    const detailedIndustryData = Array.from(originalIndustryMap.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    return (
      <>
        <div className="flex items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Insights</h1>
          <h2 className="text-lg font-medium">
            {displayText}
          </h2>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Industry Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col">
              <CardHeader className="items-center pb-0">
                <CardTitle>Orders by Industry</CardTitle>
                <CardDescription>{dateRange.displayText}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <div className="h-[400px] w-full">
                  {/* Industry Pie Chart */}
                  <div className="h-full w-full flex items-center justify-center">
                    <div id="industry-chart" className="h-full w-full hidden" 
                      data-chart={JSON.stringify(industryData)}></div>
                    <IndustryChart />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                  {industryData.length > 0 && `${industryData[0].industry} is the top industry at ${industryData[0].percentage.toFixed(1)}%`}
                </div>
                <div className="leading-none text-muted-foreground">
                  Based on {totalIndustryOrders.toLocaleString()} orders with industry data
                </div>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Industry Breakdown</CardTitle>
                <CardDescription>
                  Distribution of orders across different industries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Industry</th>
                      <th className="text-right py-2">Orders</th>
                      <th className="text-right py-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {industryData.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2">{item.industry}</td>
                        <td className="text-right py-2">{item.count.toLocaleString()}</td>
                        <td className="text-right py-2">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          
          {/* Source Channel Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col">
              <CardHeader className="items-center pb-0">
                <CardTitle>Orders by Source Channel</CardTitle>
                <CardDescription>{dateRange.displayText}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <div className="h-[400px] w-full">
                  {/* Source Channel Pie Chart */}
                  <div className="h-full w-full flex items-center justify-center">
                    <div id="sourcechannel-chart" className="h-full w-full hidden"
                      data-chart={JSON.stringify(sourceChannelData)}></div>
                    <SourceChannelChart />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                  {sourceChannelData.length > 0 && `${sourceChannelData[0].sourceChannel} is the top channel at ${sourceChannelData[0].percentage.toFixed(1)}%`}
                </div>
                <div className="leading-none text-muted-foreground">
                  Based on {totalChannelOrders.toLocaleString()} orders with source channel data
                </div>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Source Channel Breakdown</CardTitle>
                <CardDescription>
                  How customers are finding and ordering from us
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Source Channel</th>
                      <th className="text-right py-2">Orders</th>
                      <th className="text-right py-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceChannelData.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2">{item.sourceChannel}</td>
                        <td className="text-right py-2">{item.count.toLocaleString()}</td>
                        <td className="text-right py-2">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          
          {/* Industry & Source Channel Relationship */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle>Industry & Source Channel Relationship</CardTitle>
              <CardDescription>
                How different industries find and order from us
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <div className="h-[500px] w-full">
                {/* Stacked Bar Chart */}
                <div id="relationship-chart" className="h-full w-full hidden"
                  data-chart={JSON.stringify(stackedBarData)}
                  data-channels={JSON.stringify(sourceChannels)}></div>
                <RelationshipChart />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="leading-none text-muted-foreground">
                Showing top 5 industries and their source channels
              </div>
            </CardFooter>
          </Card>
          
          {/* Detailed Industry Breakdown */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Detailed Industry Breakdown</CardTitle>
              <CardDescription>
                Top 100 industries by order count (before categorization)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr>
                      <th className="text-left py-2">Industry</th>
                      <th className="text-right py-2">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedIndustryData.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2">{item.industry}</td>
                        <td className="text-right py-2">{item.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Showing original industry values before categorization
            </CardFooter>
          </Card>
        </div>
      </>
    );
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
            <div className="flex flex-col gap-6">
              {/* InsightsPageContent is an async component, Next.js handles this */}
              <InsightsPageContent />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
