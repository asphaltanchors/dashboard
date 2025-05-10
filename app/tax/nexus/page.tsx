import {
  IconCalendar,
  IconReceiptTax,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";
import { formatCurrency } from "@/lib/utils";
import { formatDateForSql, formatDateForDisplay } from "@/app/utils/dates";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { ordersInAnalytics } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface DateRange {
  from: Date;
  to: Date;
}

interface StateRevenue {
  state: string;
  totalRevenue: number;
}

// Nexus requirements for US states
const NEXUS_REQUIREMENTS = {
  "Alabama": {
    "sales_threshold": 250000,
    "transaction_threshold": null,
    "raw": "$250,000 in sales only"
  },
  "Alaska": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000"
  },
  "Arizona": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Arkansas": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "California": {
    "sales_threshold": 500000,
    "transaction_threshold": null,
    "raw": "$500,000 in sales only"
  },
  "Colorado": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Connecticut": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 and 200 transactions"
  },
  "Delaware": {
    "sales_threshold": null,
    "transaction_threshold": null,
    "raw": "No state sales tax; economic nexus does not apply"
  },
  "Florida": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Georgia": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Hawaii": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Idaho": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Illinois": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Indiana": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Iowa": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Kansas": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Kentucky": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Louisiana": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Maine": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Maryland": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Massachusetts": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Michigan": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Minnesota": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Mississippi": {
    "sales_threshold": 250000,
    "transaction_threshold": null,
    "raw": "$250,000 in sales only"
  },
  "Missouri": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Montana": {
    "sales_threshold": null,
    "transaction_threshold": null,
    "raw": "No state sales tax; economic nexus does not apply"
  },
  "Nebraska": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Nevada": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "New Hampshire": {
    "sales_threshold": null,
    "transaction_threshold": null,
    "raw": "No state sales tax; economic nexus does not apply"
  },
  "New Jersey": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "New Mexico": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "New York": {
    "sales_threshold": 500000,
    "transaction_threshold": 100,
    "raw": "$500,000 and 100 transactions"
  },
  "North Carolina": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "North Dakota": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Ohio": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Oklahoma": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Oregon": {
    "sales_threshold": null,
    "transaction_threshold": null,
    "raw": "No state sales tax; economic nexus does not apply"
  },
  "Pennsylvania": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Puerto Rico": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Rhode Island": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "South Carolina": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "South Dakota": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Tennessee": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Texas": {
    "sales_threshold": 500000,
    "transaction_threshold": null,
    "raw": "$500,000 in sales only"
  },
  "Utah": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Vermont": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Virginia": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Washington": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "District of Columbia": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "West Virginia": {
    "sales_threshold": 100000,
    "transaction_threshold": 200,
    "raw": "$100,000 or 200 transactions"
  },
  "Wisconsin": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  },
  "Wyoming": {
    "sales_threshold": 100000,
    "transaction_threshold": null,
    "raw": "$100,000 in sales only"
  }
};

// Valid US state codes
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

// Mapping of state codes to full names
const US_STATE_NAMES = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'DC': 'District of Columbia',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'PR': 'Puerto Rico',
};

async function TaxNexusPage(
  props: {
    searchParams: Promise<{ range?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  // Default to previous year (most recent full year) if no date range provided
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const defaultRange = {
    from: new Date(previousYear, 0, 1),
    to: new Date(previousYear, 11, 31),
  };

  // Parse date range from query params or use defaults
  let dateRange: DateRange = defaultRange;
  if (searchParams.range) {
    try {
      const [fromString, toString] = searchParams.range.split("..");
      if (fromString && toString) {
        const from = new Date(fromString);
        const to = new Date(toString);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          dateRange = { from, to };
        }
      }
    } catch (error) {
      console.error("Error parsing date range:", error);
    }
  }

  // Format dates for SQL queries
  const formattedStartDate = formatDateForSql(dateRange.from);
  const formattedEndDate = formatDateForSql(dateRange.to);

  // Query to get sales by state within selected time frame
  const salesByStateResult = await db
    .select({
      state: sql<string>`COALESCE(${ordersInAnalytics.billingAddressState}, 'Unknown')`.as(
        "state"
      ),
      totalRevenue: sql<number>`SUM(${ordersInAnalytics.totalAmount})`.as(
        "total_revenue"
      ),
    })
    .from(ordersInAnalytics)
    .where(
      sql`${ordersInAnalytics.orderDate} BETWEEN ${formattedStartDate} AND ${formattedEndDate}`
    )
    .groupBy(ordersInAnalytics.billingAddressState)
    .orderBy(sql`total_revenue DESC`);

  // Process sales by state data

  // Clean up unknown or empty states, filter for US states only, and format data
  const salesByState: StateRevenue[] = salesByStateResult
    .filter((item) => 
      US_STATES.includes(item.state) || 
      (item.state === "Unknown" || !item.state) // Keep Unknown for reporting completeness
    )
    .map((item) => ({
      state: item.state === "Unknown" || !item.state ? "Unknown" : item.state,
      totalRevenue: Number(item.totalRevenue || 0),
    }));

  // Calculate YTD (Year-to-Date) range for the current year
  const ytdFrom = new Date(currentYear, 0, 1);
  const ytdTo = new Date(); // Today

  // Format YTD dates for SQL queries
  const formattedYtdStartDate = formatDateForSql(ytdFrom);
  const formattedYtdEndDate = formatDateForSql(ytdTo);

  // Query to get YTD sales by state for comparison
  const ytdSalesByStateResult = await db
    .select({
      state: sql<string>`COALESCE(${ordersInAnalytics.billingAddressState}, 'Unknown')`.as(
        "state"
      ),
      totalRevenue: sql<number>`SUM(${ordersInAnalytics.totalAmount})`.as(
        "total_revenue"
      ),
    })
    .from(ordersInAnalytics)
    .where(
      sql`${ordersInAnalytics.orderDate} BETWEEN ${formattedYtdStartDate} AND ${formattedYtdEndDate}`
    )
    .groupBy(ordersInAnalytics.billingAddressState)
    .orderBy(sql`total_revenue DESC`);

  // Create a map of YTD sales by state (US states only)
  const ytdSalesByStateMap = new Map<string, number>();
  ytdSalesByStateResult
    .filter((item) => 
      US_STATES.includes(item.state) || 
      (item.state === "Unknown" || !item.state) // Keep Unknown for reporting completeness
    )
    .forEach((item) => {
      const state = item.state === "Unknown" || !item.state ? "Unknown" : item.state;
      ytdSalesByStateMap.set(state, Number(item.totalRevenue || 0));
    });

  // Calculate what percentage of the year has elapsed
  const startOfYear = new Date(currentYear, 0, 1);
  const now = new Date();
  const daysInYear = 365 + (currentYear % 4 === 0 ? 1 : 0); // Account for leap years
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const yearProgressPercentage = dayOfYear / daysInYear;

  // Add YTD comparison data and projected annual revenue
  const salesByStateWithComparison = salesByState.map((item) => {
    const ytdRevenue = ytdSalesByStateMap.get(item.state) || 0;
    // Project annual revenue based on YTD and percentage of year elapsed
    const projectedRevenue = yearProgressPercentage > 0 
      ? ytdRevenue / yearProgressPercentage 
      : 0;
    
    // Get nexus requirements for this state
    // Convert from 2-letter codes to full state names
    const stateFullName = US_STATE_NAMES[item.state as keyof typeof US_STATE_NAMES] || item.state;
    const nexusRequirement = stateFullName in NEXUS_REQUIREMENTS 
      ? NEXUS_REQUIREMENTS[stateFullName as keyof typeof NEXUS_REQUIREMENTS] 
      : undefined;
    
    // Calculate nexus status based on projected revenue
    let nexusStatus = 'none';
    let nexusMessage = '';
    
    if (nexusRequirement) {
      const salesThreshold = nexusRequirement.sales_threshold;
      
      if (salesThreshold === null) {
        nexusStatus = 'exempt';
        nexusMessage = 'No sales tax';
      } else if (projectedRevenue >= salesThreshold) {
        nexusStatus = 'exceeded';
        nexusMessage = 'Nexus triggered';
      } else if (projectedRevenue >= salesThreshold * 0.8) {
        nexusStatus = 'approaching';
        nexusMessage = 'Approaching threshold';
      } else {
        nexusStatus = 'safe';
        nexusMessage = 'Below threshold';
      }
    }
    
    return {
      ...item,
      ytdRevenue,
      projectedRevenue,
      nexusRequirement,
      nexusStatus,
      nexusMessage,
    };
  })
  // Sort by projected revenue in descending order
  .sort((a, b) => b.projectedRevenue - a.projectedRevenue);

  // Calculate total YTD revenue (US states only)
  const totalYtdRevenue = ytdSalesByStateResult
    .filter((item) => 
      US_STATES.includes(item.state) || 
      (item.state === "Unknown" || !item.state)
    )
    .reduce(
      (sum, item) => sum + Number(item.totalRevenue || 0),
      0
    );

  // Calculate total projected revenue based on YTD
  const totalProjectedRevenue = yearProgressPercentage > 0 
    ? totalYtdRevenue / yearProgressPercentage 
    : 0;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex flex-col items-center justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center sm:gap-0 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconReceiptTax className="h-6 w-6" />
            Tax Nexus Report
          </h1>
          <p className="text-muted-foreground">
            View sales by state to determine tax nexus requirements
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <DateRangePicker />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div>
              {formatDateForDisplay(dateRange.from)} -{" "}
              {formatDateForDisplay(dateRange.to)}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">
                  YTD Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-bold">
                  {formatCurrency(totalYtdRevenue)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="ml-1">{currentYear} Year-to-Date ({(yearProgressPercentage * 100).toFixed(1)}% of year)</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">
                  Projected Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-2xl font-bold">
                  {formatCurrency(totalProjectedRevenue)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <IconCalendar className="mr-1 h-3 w-3" />
                  <span>Projected {currentYear} Total</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>US Sales by State</CardTitle>
              <CardDescription>
                Compare {previousYear} full year with {currentYear} YTD by state for tax nexus analysis
              </CardDescription>
              <div className="mt-2 text-xs text-muted-foreground">
                Showing {salesByStateWithComparison.length} states with sales activity. Projections are based on {(yearProgressPercentage * 100).toFixed(1)}% of the year completed. Nexus status is calculated using projected annual revenue.
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>US State</TableHead>
                      <TableHead className="text-right">{previousYear} Revenue</TableHead>
                      <TableHead className="text-right">{currentYear} YTD</TableHead>
                      <TableHead className="text-right">Projected {currentYear}</TableHead>
                      <TableHead>Nexus Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByStateWithComparison.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.state}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.ytdRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.projectedRevenue)}
                        </TableCell>
                        <TableCell>
                          {item.nexusStatus === 'exceeded' && (
                            <div className="flex items-center">
                              <IconCircleX className="mr-1 h-4 w-4 text-red-500" />
                              <span className="text-red-500 font-medium">{item.nexusMessage}</span>
                              <span className="ml-1 text-xs text-muted-foreground">({item.nexusRequirement && 'raw' in item.nexusRequirement ? item.nexusRequirement.raw : 'Unknown'})</span>
                            </div>
                          )}
                          {item.nexusStatus === 'approaching' && (
                            <div className="flex items-center">
                              <IconAlertTriangle className="mr-1 h-4 w-4 text-amber-500" />
                              <span className="text-amber-500 font-medium">{item.nexusMessage}</span>
                              <span className="ml-1 text-xs text-muted-foreground">({item.nexusRequirement && 'raw' in item.nexusRequirement ? item.nexusRequirement.raw : 'Unknown'})</span>
                            </div>
                          )}
                          {item.nexusStatus === 'safe' && (
                            <div className="flex items-center">
                              <IconCircleCheck className="mr-1 h-4 w-4 text-green-500" />
                              <span className="text-green-500 font-medium">{item.nexusMessage}</span>
                              <span className="ml-1 text-xs text-muted-foreground">({item.nexusRequirement && 'raw' in item.nexusRequirement ? item.nexusRequirement.raw : 'Unknown'})</span>
                            </div>
                          )}
                          {item.nexusStatus === 'exempt' && (
                            <div className="flex items-center">
                              <span className="text-muted-foreground">{item.nexusMessage}</span>
                            </div>
                          )}
                          {item.nexusStatus === 'none' && (
                            <div className="flex items-center">
                              <span className="text-muted-foreground">Unknown</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {salesByStateWithComparison.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No US sales data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </main>
  );
}

export default TaxNexusPage;