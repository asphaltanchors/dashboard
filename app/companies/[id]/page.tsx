import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { notFound } from "next/navigation"
import { StaticOrdersTable } from "@/components/orders/static-orders-table"
import { SingleEnrichButton } from "@/components/companies/single-enrich-button"

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CompanyPage(props: PageProps) {
  const params = await props.params;
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      domain: true,
      enriched: true,
      enrichedAt: true,
      enrichedSource: true,
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

  if (!company) {
    notFound()
  }

  const totalOrders = company.customers.reduce((sum, customer) => {
    const customerTotal = customer.orders.reduce(
      (orderSum, order) => orderSum + Number(order.totalAmount),
      0
    )
    return sum + customerTotal
  }, 0)

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Company Details</h1>
    <div className="space-y-6">
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
                  <dd className="mt-1">
                    ${totalOrders.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
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
                      <td className="px-4 py-2">
                        ${customerTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
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

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  </div>
  )
}
