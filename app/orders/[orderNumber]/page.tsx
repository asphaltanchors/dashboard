import { db } from "../../../db";
import { sql } from "drizzle-orm";
import { orders, orderItems, orderCompanyView } from "../../../db/schema";
import { notFound } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";

export default async function OrderDetailPage({
  params,
}: {
  params: { orderNumber: string };
}) {
  // Wait for params to be available
  const orderParams = await params;
  const { orderNumber } = orderParams;

  // Fetch the order details
  const orderDetails = await db.select()
    .from(orders)
    .where(sql`${orders.orderNumber} = ${orderNumber}`)
    .limit(1);

  // If order not found, return 404
  if (orderDetails.length === 0) {
    notFound();
  }

  const order = orderDetails[0];

  // Fetch the order items
  const items = await db.select()
    .from(orderItems)
    .where(sql`${orderItems.orderNumber} = ${orderNumber}`);

  // Fetch company information if available
  const companyInfo = await db.select()
    .from(orderCompanyView)
    .where(sql`${orderCompanyView.orderNumber} = ${orderNumber}`)
    .limit(1);

  // Calculate order summary
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineAmount || 0), 0);
  
  // Shipping items
  const shippingItems = items.filter(item => item.productCode === 'Shipping');
  const shippingTotal = shippingItems.reduce((sum, item) => sum + Number(item.lineAmount || 0), 0);
  
  // Tax calculation (assuming tax is the difference between total and subtotal+shipping)
  const taxAmount = Number(order.totalAmount) - subtotal - shippingTotal;

  // Format the order date
  const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Unknown';

  // Check if there's company information
  const hasCompanyInfo = companyInfo.length > 0;
  const company = hasCompanyInfo ? companyInfo[0] : null;

  return (
    <DashboardLayout 
      title={`Order #${orderNumber}`}
      showTimeFramePicker={false}
    >
      <div className="mb-8 flex justify-between items-center">
        <Link 
          href="/orders" 
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Orders
        </Link>
        <div className={`px-3 py-1 rounded-full text-sm ${
          order.status === 'Paid' ? 'bg-green-100 text-green-800' :
          order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {order.status || 'Unknown'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md col-span-2">
          <h2 className="text-xl font-semibold mb-4">Order Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Order Number</p>
              <p className="font-medium">{orderNumber}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Order Date</p>
              <p className="font-medium">{orderDate}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Order Type</p>
              <p className="font-medium">{order.orderType || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Payment Method</p>
              <p className="font-medium">{order.paymentMethod || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">PO Number</p>
              <p className="font-medium">{order.poNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Terms</p>
              <p className="font-medium">{order.terms || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Class</p>
              <p className="font-medium">{order.class || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Status</p>
              <p className="font-medium">{order.status || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="font-medium">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Shipping</span>
              <span className="font-medium">${shippingTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tax</span>
              <span className="font-medium">${taxAmount.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold text-xl">${Number(order.totalAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          <p><span className="text-gray-500 dark:text-gray-400">Customer Name:</span> {order.customerName}</p>
          
          {hasCompanyInfo && (
            <>
              <div className="mt-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Company</p>
                <p className="font-medium">{company?.companyName}</p>
                {company?.companyDomain && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{company.companyDomain}</p>
                )}
              </div>
              
              {company?.matchType && (
                <div className="mt-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Match Details</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      company.matchType === 'exact' ? 'bg-green-100 text-green-800' :
                      company.matchType === 'fuzzy' ? 'bg-yellow-100 text-yellow-800' :
                      company.matchType === 'manual' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {company.matchType}
                    </span>
                    {company.confidence && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(company.confidence * 100).toFixed(1)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Address Information</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Billing Address</h3>
              <p>{order.billingAddressLine1 || 'N/A'}</p>
              {order.billingAddressLine2 && <p>{order.billingAddressLine2}</p>}
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Shipping Address</h3>
              <p>{order.shippingAddressLine1 || 'N/A'}</p>
              {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 text-left">Product</th>
                <th className="py-2 text-right">Quantity</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  <td className="py-2 text-left">
                    <div className="font-medium">
                      {item.productCode === 'Shipping' 
                        ? 'Shipping' 
                        : (
                          <Link 
                            href={`/products/${encodeURIComponent(item.productCode)}`}
                            className="text-blue-600 hover:underline"
                          >
                            {item.productCode}
                          </Link>
                        )
                      }
                    </div>
                    {item.productDescription && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.productDescription}
                      </div>
                    )}
                    {item.productClass && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Class: {item.productClass}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {item.quantity 
                      ? Number(item.quantity).toLocaleString() 
                      : '-'
                    }
                  </td>
                  <td className="py-2 text-right">
                    ${Number(item.unitPrice || 0).toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    ${Number(item.lineAmount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}