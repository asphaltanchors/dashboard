import { Card } from "@/components/ui/card"
import { getOrderByQuickbooksId } from "@/lib/orders"
import { formatCurrency } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

interface OrderPageProps {
  params: Promise<{ quickbooksId: string }>
}

export default async function OrderPage({
  params,
}: OrderPageProps) {
  const resolvedParams = await params
  const order = await getOrderByQuickbooksId(resolvedParams.quickbooksId)
  
  // Calculate total from items
  const calculatedTotal = order.items.reduce((sum, item) => sum + item.amount, 0)
  
  // Calculate percentage difference
  const percentageDiff = Math.abs((calculatedTotal - order.totalAmount) / order.totalAmount * 100)
  
  // Determine amount style based on difference
  const getAmountStyle = () => {
    if (percentageDiff <= 1) {
      return "text-green-600"
    }
    return percentageDiff <= 5 ? "" : "text-yellow-600"
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-1">Order {order.orderNumber}</h1>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">
              {order.customer.customerName}
              {order.customer.company?.name && order.customer.company.domain && (
                <Link href={`/companies/${order.customer.company.domain}`} className="text-gray-700 hover:underline transition-colors">
                  {" • "}{order.customer.company.name}
                </Link>
              )}
            </p>
            {(order.customer.emails.some(e => e.isPrimary) || order.customer.phones.some(p => p.isPrimary)) && (
              <div className="text-sm text-gray-500 flex items-center gap-4">
                {order.customer.emails.find(e => e.isPrimary) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        <a 
                          href={`mailto:${order.customer.emails.find(e => e.isPrimary)?.email}`}
                          className="hover:underline"
                        >
                          {order.customer.emails.find(e => e.isPrimary)?.email}
                        </a>
                        {order.customer.emails.length > 1 && (
                          <span className="text-xs text-gray-400">+{order.customer.emails.length - 1}</span>
                        )}
                      </TooltipTrigger>
                      {order.customer.emails.length > 1 && (
                        <TooltipContent>
                          <p className="font-semibold mb-1">Additional Emails</p>
                          {order.customer.emails.filter(e => !e.isPrimary).map((email, i) => (
                            <p key={i} className="text-sm">
                              {email.email} <span className="text-gray-400">({email.type.toLowerCase()})</span>
                            </p>
                          ))}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
                {order.customer.phones.find(p => p.isPrimary) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        <a 
                          href={`tel:${order.customer.phones.find(p => p.isPrimary)?.phone}`}
                          className="hover:underline"
                        >
                          {order.customer.phones.find(p => p.isPrimary)?.phone}
                        </a>
                        {order.customer.phones.length > 1 && (
                          <span className="text-xs text-gray-400">+{order.customer.phones.length - 1}</span>
                        )}
                      </TooltipTrigger>
                      {order.customer.phones.length > 1 && (
                        <TooltipContent>
                          <p className="font-semibold mb-1">Additional Phone Numbers</p>
                          {order.customer.phones.filter(p => !p.isPrimary).map((phone, i) => (
                            <p key={i} className="text-sm">
                              {phone.phone} <span className="text-gray-400">({phone.type.toLowerCase()})</span>
                            </p>
                          ))}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Order Date</div>
          <div>{order.orderDate.toLocaleDateString()}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Order Details</h2>
          <dl className="space-y-2">
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Amount</dt>
              <dd className="flex items-center gap-2">
                <span className={getAmountStyle()}>
                  {formatCurrency(order.totalAmount)}
                </span>
                {percentageDiff > 5 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Order total differs from sum of items by {percentageDiff.toFixed(1)}%</p>
                        <p className="text-xs mt-1">
                          Order total: {formatCurrency(order.totalAmount)}<br/>
                          Items total: {formatCurrency(calculatedTotal)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd>{order.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Payment Status</dt>
              <dd>{order.paymentStatus}</dd>
            </div>
            {order.paymentMethod && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Payment Method</dt>
                <dd>{order.paymentMethod}</dd>
              </div>
            )}
            {order.paymentDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Payment Date</dt>
                <dd>{order.paymentDate.toLocaleDateString()}</dd>
              </div>
            )}
            {order.dueDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Due Date</dt>
                <dd>{order.dueDate.toLocaleDateString()}</dd>
              </div>
            )}
            {order.poNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-500">PO Number</dt>
                <dd>{order.poNumber}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Addresses</h2>
          <div className="grid grid-cols-2 gap-6">
            {order.billingAddress && (
              <div>
                <h3 className="text-sm text-gray-500 mb-2">Billing Address</h3>
                <div className="text-sm">
                  <div>{order.billingAddress.line1}</div>
                  {order.billingAddress.line2 && <div>{order.billingAddress.line2}</div>}
                  <div>
                    {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                  </div>
                  {order.billingAddress.country && <div>{order.billingAddress.country}</div>}
                </div>
              </div>
            )}
            {order.shippingAddress && (
              <div>
                <h3 className="text-sm text-gray-500 mb-2">Shipping Address</h3>
                <div className="text-sm">
                  <div>{order.shippingAddress.line1}</div>
                  {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </div>
                  {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Order Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2">Product</th>
                <th className="text-right pb-2">Quantity</th>
                <th className="text-right pb-2">Unit Price</th>
                <th className="text-right pb-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item, index) => (
                <tr key={index} className="text-sm">
                  <td className="py-2">
                    <div>{item.product.name}</div>
                    {item.description && (
                      <div className="text-gray-500 text-xs">{item.description}</div>
                    )}
                  </td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right py-2">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="text-sm">
              <tr className="border-t">
                <td colSpan={3} className="text-right pt-2">Subtotal</td>
                <td className="text-right pt-2">{formatCurrency(order.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-right">Tax</td>
                <td className="text-right">{formatCurrency(order.taxAmount)}</td>
              </tr>
              <tr className="font-semibold">
                <td colSpan={3} className="text-right">Total</td>
                <td className="text-right">{formatCurrency(order.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
