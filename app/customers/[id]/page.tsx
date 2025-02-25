import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { notFound } from "next/navigation"
import Link from "next/link"
import { SingleEnrichButton } from "@/components/companies/single-enrich-button"
import { StaticOrdersTable } from "@/components/orders/static-orders-table"

const needsEnrichment = (company: { 
  enriched: boolean, 
  enrichedAt: Date | null,
  enrichmentError: string | null 
}) => {
  // Don't show button if there was a failed attempt (no data available)
  if (company.enrichmentError) return false;
  
  // If not enriched and never attempted, show button
  if (!company.enriched && !company.enrichedAt) return true;
  
  // If successfully enriched, check 3-month threshold
  if (company.enriched && company.enrichedAt) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return company.enrichedAt < threeMonthsAgo;
  }
  
  return false;
}

export default async function CustomerPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      customerName: true,
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
          enriched: true,
          enrichedAt: true,
          enrichedSource: true,
          enrichmentError: true,
        },
      },
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
      status: true,
      createdAt: true,
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
          shippingAddress: {
            select: {
              line1: true,
              line2: true,
              city: true,
              state: true,
              postalCode: true,
              country: true
            }
          },
        },
        orderBy: {
          orderDate: 'desc'
        },
      },
    },
  })

  if (!customer) {
    notFound()
  }

  const totalOrders = customer.orders.reduce(
    (sum, order) => sum + Number(order.totalAmount),
    0
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Basic Information</h3>
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1">{customer.customerName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="mt-1">
                    {customer.company ? (
                      <Link href={`/companies/${customer.company.domain}`} className="text-blue-600 hover:underline">
                        {customer.company.name ?? customer.company.domain}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.status === 'active'
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {customer.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="font-semibold">Contact Information</h3>
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Primary Email</dt>
                  <dd className="mt-1">
                    {customer.emails.find(e => e.isPrimary)?.email ?? customer.emails[0]?.email ?? 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Primary Phone</dt>
                  <dd className="mt-1">
                    {customer.phones.find(p => p.isPrimary)?.phone ?? customer.phones[0]?.phone ?? 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Customer Since</dt>
                  <dd className="mt-1">{new Date(customer.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {customer.company && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <Link href={`/companies/${customer.company.domain}`} className="text-blue-600 hover:underline">
                Company Information
              </Link>
            </CardTitle>
            {needsEnrichment(customer.company) && (
              <SingleEnrichButton 
                domain={customer.company.domain}
                isEnriched={customer.company.enriched}
              />
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold">Basic Information</h3>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1">{customer.company.name ?? customer.company.domain}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Domain</dt>
                    <dd className="mt-1">{customer.company.domain}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="font-semibold">Enrichment Details</h3>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.company.enriched
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {customer.company.enriched ? "Enriched" : "Pending"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Enriched</dt>
                    <dd className="mt-1">
                      {customer.company.enrichedAt ? new Date(customer.company.enrichedAt).toLocaleDateString() : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Source</dt>
                    <dd className="mt-1">{customer.company.enrichedSource || "-"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Total Order Value: ${totalOrders.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <StaticOrdersTable
            initialOrders={{
              orders: customer.orders.map(order => ({
                ...order,
                customerName: customer.customerName,
                totalAmount: Number(order.totalAmount),
                shippingAddress: order.shippingAddress
              })),
              totalCount: customer.orders.length,
              recentCount: customer.orders.filter(order => {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return new Date(order.orderDate) >= thirtyDaysAgo;
              }).length
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
