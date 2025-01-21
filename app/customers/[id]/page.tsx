import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { notFound } from "next/navigation"

export default async function CustomerPage({
  params,
}: {
  params: { id: string }
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      customerName: true,
      company: {
        select: {
          name: true,
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
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
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
                  <dd className="mt-1">{customer.company?.name ?? 'N/A'}</dd>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Order Number</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="px-4 py-2">{order.orderNumber}</td>
                    <td className="px-4 py-2">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      ${Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
