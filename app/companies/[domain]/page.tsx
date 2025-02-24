import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomerRevenueCard } from "@/components/companies/customer-revenue-card"
import { notFound } from "next/navigation"
import { ProgressiveCompanyCard, EnrichmentData } from "@/components/companies/progressive-company-card"
import { StaticOrdersTable } from "@/components/orders/static-orders-table"
import { SingleEnrichButton } from "@/components/companies/single-enrich-button"
import { formatCurrency } from "@/lib/utils"
import { Order } from "@/lib/orders"

// Types
interface CompanyDetails {
  id: string
  name: string | null
  domain: string
  enriched: boolean
  enrichedAt: Date | null
  enrichedSource: string | null
  enrichmentData: EnrichmentData | null
  customers: CustomerDetails[]
}

interface CustomerDetails {
  id: string
  customerName: string
  status: string
  emails: Array<{
    email: string
    isPrimary: boolean
  }>
  phones: Array<{
    phone: string
    isPrimary: boolean
  }>
  orders: Order[]
}

interface PageProps {
  params: Promise<{
    domain: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Data fetching
async function getCompanyDetails(domain: string): Promise<CompanyDetails | null> {
  const result = await prisma.company.findUnique({
    where: { domain },
    select: {
      id: true,
      name: true,
      domain: true,
      enriched: true,
      enrichedAt: true,
      enrichedSource: true,
      enrichmentData: true,
      customers: {
        select: {
          id: true,
          customerName: true,
          status: true,
          emails: {
            select: {
              email: true,
              isPrimary: true,
            },
          },
          phones: {
            select: {
              phone: true,
              isPrimary: true,
            },
          },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              orderDate: true,
              status: true,
              paymentStatus: true,
              totalAmount: true,
              dueDate: true,
              paymentMethod: true,
              quickbooksId: true,
            },
          },
        },
        orderBy: {
          customerName: 'asc',
        },
      },
    },
  })

  if (!result) return null

  return {
    ...result,
    enrichmentData: result.enriched && result.enrichmentData ? mapEnrichmentData(result.enrichmentData) : (result.enrichmentData as EnrichmentData | null),
    customers: result.customers.map(customer => ({
      ...customer,
      orders: customer.orders.map(order => ({
        ...order,
        customerName: customer.customerName,
        totalAmount: Number(order.totalAmount),
        orderDate: order.orderDate || new Date()
      }))
    }))
  }
}

// Helper function to map raw enrichment data to the expected format
function mapEnrichmentData(enrichedData: any): EnrichmentData {
  if (!enrichedData) return {};
  
  // Parse the JSON string if it's a string
  const data = typeof enrichedData === 'string' ? JSON.parse(enrichedData) : enrichedData;
  
  // Log only the revenue data for debugging
  if (data.revenue_annual_range) {
    console.log('Revenue Data:', JSON.stringify(data.revenue_annual_range, null, 2));
  }
  
  return {
    about: {
      name: data.company_name || data.company_legal_name,
      industries: data.categories_and_keywords || [data.industry].filter(Boolean),
      yearFounded: data.founded_year ? parseInt(data.founded_year) : undefined,
      totalEmployees: data.size_range,
      totalEmployeesExact: data.employees_count
    },
    socials: {
      twitter: data.twitter_url?.length ? { url: data.twitter_url[0] } : undefined,
      facebook: data.facebook_url?.length ? { url: data.facebook_url[0] } : undefined,
      linkedin: data.linkedin_url ? { url: data.linkedin_url } : undefined
    },
    finances: {
      revenue: data.revenue_annual_range ? 
        (typeof data.revenue_annual_range === 'object' ? 
          formatRevenueRange(data.revenue_annual_range) : 
          data.revenue_annual_range) : 
        undefined
    },
    analytics: {
      monthlyVisitors: data.total_website_visits_monthly ? 
        `${data.total_website_visits_monthly}` : undefined
    },
    locations: {
      headquarters: data.hq_city || data.hq_state || data.hq_country ? {
        city: { name: data.hq_city || '' },
        state: { name: data.hq_state || '' },
        country: { name: data.hq_country || '' }
      } : undefined
    },
    descriptions: {
      primary: data.description_enriched || data.description
    }
  };
}

// Helper function to format revenue range from complex object
function formatRevenueRange(revenueData: any): string {
  // If it's already a string, return it
  if (typeof revenueData === 'string') return revenueData;
  
  // Handle the exact structure we saw in the console
  if (revenueData.source_6_annual_revenue_range && 
      typeof revenueData.source_6_annual_revenue_range === 'object') {
    const sourceData = revenueData.source_6_annual_revenue_range;
    const from = sourceData.annual_revenue_range_from;
    const to = sourceData.annual_revenue_range_to;
    const currency = sourceData.annual_revenue_range_currency || '$';
    
    if (from && to) {
      return `${formatLargeNumber(from, currency)}-${formatLargeNumber(to, currency)}`;
    } else if (from) {
      return `${formatLargeNumber(from, currency)}+`;
    } else if (to) {
      return `Up to ${formatLargeNumber(to, currency)}`;
    }
  }
  
  // Generic approach for any source with valid data
  for (const sourceKey in revenueData) {
    const sourceData = revenueData[sourceKey];
    
    // Skip null sources
    if (!sourceData) continue;
    
    // If we have range data
    if (typeof sourceData === 'object') {
      // Try lowercase property names (as seen in the console output)
      const from = sourceData.annual_revenue_range_from;
      const to = sourceData.annual_revenue_range_to;
      const currency = sourceData.annual_revenue_range_currency || '$';
      
      // Format the revenue range
      if (from && to) {
        return `${formatLargeNumber(from, currency)}-${formatLargeNumber(to, currency)}`;
      } else if (from) {
        return `${formatLargeNumber(from, currency)}+`;
      } else if (to) {
        return `Up to ${formatLargeNumber(to, currency)}`;
      }
    }
  }
  
  // If no valid data found
  return "Revenue unknown";
}

// Helper function to format large numbers in a readable way
function formatLargeNumber(num: number, currency: string = '$'): string {
  if (num >= 1000000000) {
    return `${currency}${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${currency}${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${currency}${(num / 1000).toFixed(1)}K`;
  }
  return `${currency}${num}`;
}

// Helper functions
function calculateTotalOrders(customers: CustomerDetails[]): number {
  return customers.reduce((sum, customer) => {
    const customerTotal = customer.orders.reduce(
      (orderSum, order) => orderSum + Number(order.totalAmount),
      0
    )
    return sum + customerTotal
  }, 0)
}

function calculateYearlyRevenue(customers: CustomerDetails[]) {
  const yearlyRevenue = customers.reduce((acc: { [key: string]: number }, customer) => {
    customer.orders.forEach((order) => {
      if (order.orderDate) {
        const year = new Date(order.orderDate).getFullYear()
        acc[year] = (acc[year] || 0) + Number(order.totalAmount)
      }
    })
    return acc
  }, {})

  return Object.entries(yearlyRevenue)
    .map(([year, revenue]) => ({
      year: parseInt(year),
      revenue: Math.round(revenue)
    }))
    .sort((a, b) => a.year - b.year)
}

export default async function CompanyPage(props: PageProps) {
  const params = await props.params
  const company = await getCompanyDetails(params.domain)

  if (!company) {
    notFound()
  }

  const totalOrders = calculateTotalOrders(company.customers)
  const revenueData = calculateYearlyRevenue(company.customers)

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Company Details</h1>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {company.enriched && company.enrichmentData ? (
            <>
              <ProgressiveCompanyCard 
                domain={company.domain}
                name={company.name}
                totalOrders={totalOrders}
                customerCount={company.customers.length}
                enrichmentData={company.enrichmentData}
                isEnriched={company.enriched}
                enrichedAt={company.enrichedAt}
                enrichedSource={company.enrichedSource}
              />
              <CustomerRevenueCard data={revenueData} />
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold">Basic Information</h3>
                      <dl className="mt-2 space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Name</dt>
                          <dd className="mt-1">{company.name ?? company.domain}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Domain</dt>
                          <dd className="mt-1">{company.domain}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Total Orders</dt>
                          <dd className="mt-1">{formatCurrency(totalOrders)}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center justify-between">
                        Enrichment Details
                        <SingleEnrichButton domain={company.domain} isEnriched={company.enriched} />
                      </h3>
                      <dl className="mt-2 space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Status</dt>
                          <dd className="mt-1">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                company.enriched
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {company.enriched ? "Enriched" : "Pending"}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Last Enriched</dt>
                          <dd className="mt-1">
                            {company.enrichedAt ? new Date(company.enrichedAt).toLocaleDateString() : "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Source</dt>
                          <dd className="mt-1">{company.enrichedSource || "-"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <CustomerRevenueCard data={revenueData} />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customers ({company.customers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Orders</th>
                    <th className="px-4 py-2 text-left">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {company.customers.map((customer) => {
                    const customerTotal = customer.orders.reduce(
                      (sum, order) => sum + Number(order.totalAmount),
                      0
                    )
                    return (
                      <tr key={customer.id} className="border-b">
                        <td className="px-4 py-2">{customer.customerName}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                              customer.status === 'active'
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {customer.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{customer.orders.length}</td>
                        <td className="px-4 py-2">{formatCurrency(customerTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-4">Email Addresses</h3>
                <div className="space-y-2">
                  {Array.from(new Set(
                    company.customers.flatMap(customer => 
                      customer.emails.map(e => ({
                        email: e.email,
                        isPrimary: e.isPrimary,
                        customer: customer.customerName
                      }))
                    )
                  )).map((contact, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">{contact.email}</span>
                        {contact.isPrimary && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Contact for: {contact.customer}
                      </div>
                    </div>
                  ))}
                  {company.customers.every(c => c.emails.length === 0) && (
                    <p className="text-sm text-gray-500">No email addresses found</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Phone Numbers</h3>
                <div className="space-y-2">
                  {Array.from(new Set(
                    company.customers.flatMap(customer => 
                      customer.phones.map(p => ({
                        phone: p.phone,
                        isPrimary: p.isPrimary,
                        customer: customer.customerName
                      }))
                    )
                  )).map((contact, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">{contact.phone}</span>
                        {contact.isPrimary && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Contact for: {contact.customer}
                      </div>
                    </div>
                  ))}
                  {company.customers.every(c => c.phones.length === 0) && (
                    <p className="text-sm text-gray-500">No phone numbers found</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <StaticOrdersTable 
          initialOrders={{
            orders: company.customers.flatMap(customer => 
              customer.orders.map(order => ({
                ...order,
                customerName: customer.customerName,
                totalAmount: Number(order.totalAmount),
                orderDate: order.orderDate || new Date(),
              }))
            ),
            totalCount: company.customers.reduce((sum, customer) => sum + customer.orders.length, 0),
            recentCount: company.customers.reduce((sum, customer) => sum + customer.orders.length, 0)
          }}
        />
      </div>
    </div>
  )
}
