import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { ProgressiveCompanyCard } from "@/components/companies/progressive-company-card"
import { EnrichmentData, mapEnrichmentData } from "@/types/enrichment"
import { ReportHeader } from "@/components/reports/report-header"
import { RevenueTrendsChart } from "@/components/companies/revenue-trends-chart"

interface PageProps {
  params: Promise<{
    domain: string
  }>
}

// Types
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
  orders: Array<{
    id: string
    orderNumber: string
    orderDate: Date
    status: string
    paymentStatus: string
    totalAmount: number
    dueDate: Date | null
    paymentMethod: string | null
    quickbooksId: string | null
  }>
}

async function getCompanyDetails(domain: string) {
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
      companyStats: {
        select: {
          customerCount: true,
          totalOrders: true
        }
      },
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
            orderBy: {
              orderDate: 'desc'
            }
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
    totalOrders: Number(result.companyStats?.totalOrders || 0),
    customerCount: result.companyStats?.customerCount || 0,
    enrichmentData: result.enriched && result.enrichmentData ? mapEnrichmentData(result.enrichmentData) : (result.enrichmentData as EnrichmentData | null),
    customers: result.customers.map(customer => ({
      ...customer,
      orders: customer.orders.map(order => ({
        ...order,
        totalAmount: Number(order.totalAmount),
      }))
    })) as CustomerDetails[]
  }
}

function calculateYearlyRevenue(customers: CustomerDetails[]) {
  const yearlyRevenue = customers.reduce((acc: Record<string, number>, customer) => {
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

  const revenueData = calculateYearlyRevenue(company.customers)
  const allOrders = company.customers.flatMap(customer => 
    customer.orders.map(order => ({
      ...order,
      customerName: customer.customerName
    }))
  ).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())

  // Extract unique contacts
  const uniqueEmails = Array.from(
    new Map(
      company.customers.flatMap(customer => 
        customer.emails.map(e => [
          e.email, 
          { email: e.email, isPrimary: e.isPrimary, customer: customer.customerName }
        ])
      )
    ).values()
  )

  const uniquePhones = Array.from(
    new Map(
      company.customers.flatMap(customer => 
        customer.phones.map(p => [
          p.phone, 
          { phone: p.phone, isPrimary: p.isPrimary, customer: customer.customerName }
        ])
      )
    ).values()
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <ReportHeader
          title="Company Details"
          resetPath="/c2"
        />
      </div>
      
      <div className="space-y-8">
        {/* Top Section: Company Card and Revenue Trends */}
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ProgressiveCompanyCard
              domain={company.domain}
              name={company.name}
              totalOrders={company.totalOrders}
              customerCount={company.customerCount}
              enrichmentData={company.enrichmentData}
              isEnriched={company.enriched}
              enrichedAt={company.enrichedAt}
              enrichedSource={company.enrichedSource}
            />
          </div>
          
          {/* Revenue Trends Chart */}
          {revenueData.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-xl border shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Revenue Trends</h2>
              <RevenueTrendsChart data={revenueData} />
            </div>
          )}
        </div>
        
        {/* Customers Section */}
        {company.customers.length > 0 && (
          <div className="bg-white rounded-xl border shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Customers ({company.customers.length})</h2>
            </div>
            <div className="p-6">
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
                        <tr key={customer.id} className="border-b hover:bg-slate-50">
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
                          <td className="px-4 py-2">${customerTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Contacts Section */}
        {(uniqueEmails.length > 0 || uniquePhones.length > 0) && (
          <div className="bg-white rounded-xl border shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Contacts</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {uniqueEmails.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">Email Addresses</h3>
                    <div className="space-y-2">
                      {uniqueEmails.map((contact, idx) => (
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
                    </div>
                  </div>
                )}

                {uniquePhones.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">Phone Numbers</h3>
                    <div className="space-y-2">
                      {uniquePhones.map((contact, idx) => (
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
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Recent Orders Section */}
        {allOrders.length > 0 && (
          <div className="bg-white rounded-xl border shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Recent Orders ({allOrders.length})</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Order #</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-2">{order.orderNumber}</td>
                        <td className="px-4 py-2">{new Date(order.orderDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{order.customerName}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                order.status === 'OPEN'
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === 'CLOSED'
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {order.status}
                            </span>
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                order.paymentStatus === 'PAID'
                                  ? "bg-green-100 text-green-800"
                                  : order.paymentStatus === 'PARTIAL'
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allOrders.length > 10 && (
                  <div className="mt-4 text-center">
                    <span className="text-sm text-slate-500">Showing 10 of {allOrders.length} orders</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
