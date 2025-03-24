import { db } from "../../../db";
import { sql } from "drizzle-orm";
import { orderItems, orders } from "../../../db/schema";
import Link from "next/link";

export default async function ProductDashboard({
  params,
}: {
  params: { productCode: string };
}) {
  // In Next.js App Router, we can directly use params.productCode
  const productCode = params.productCode;
  
  // Get current date and calculate dates for time-based queries
  const currentDate = new Date();
  const lastYearDate = new Date(currentDate);
  lastYearDate.setFullYear(currentDate.getFullYear() - 1);
  
  const last30DaysDate = new Date(currentDate);
  last30DaysDate.setDate(currentDate.getDate() - 30);
  
  const last90DaysDate = new Date(currentDate);
  last90DaysDate.setDate(currentDate.getDate() - 90);
  
  const formattedLast30Days = last30DaysDate.toISOString().split('T')[0];
  const formattedLast90Days = last90DaysDate.toISOString().split('T')[0];
  const formattedLastYear = lastYearDate.toISOString().split('T')[0];

  // Query to get product details
  const productDetailsResult = await db.select({
    productCode: orderItems.productCode,
    productDescription: orderItems.productDescription,
    totalQuantity: sql<number>`SUM(CAST(quantity AS NUMERIC))`.as('total_quantity'),
    totalRevenue: sql<number>`SUM(line_amount)`.as('total_revenue'),
    avgUnitPrice: sql<number>`AVG(unit_price)`.as('avg_unit_price'),
    orderCount: sql<number>`COUNT(DISTINCT order_number)`.as('order_count')
  })
  .from(orderItems)
  .where(sql`product_code = ${productCode}`)
  .groupBy(orderItems.productCode, orderItems.productDescription);

  const productDetails = productDetailsResult[0] || {
    productCode,
    productDescription: 'Unknown Product',
    totalQuantity: 0,
    totalRevenue: 0,
    avgUnitPrice: 0,
    orderCount: 0
  };

  // Define type for monthly sales data
  type MonthlySales = {
    month: string;
    total_quantity: number;
    total_revenue: number;
    order_count: number;
  };

  // Query to get sales by month for this product
  const salesByMonthResult = await db.execute(sql`
    SELECT 
      TO_CHAR(o.order_date, 'YYYY-MM') as month,
      SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity,
      SUM(oi.line_amount) as total_revenue,
      COUNT(DISTINCT o.order_number) as order_count
    FROM order_items oi
    INNER JOIN orders o ON o.order_number = oi.order_number
    WHERE oi.product_code = ${productCode}
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);
  
  // Cast the result to our type
  const salesByMonth = salesByMonthResult as unknown as MonthlySales[];

  // Query to get recent orders for this product
  const recentOrders = await db.select({
    orderNumber: orderItems.orderNumber,
    orderDate: orders.orderDate,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    lineAmount: orderItems.lineAmount,
    customerName: orders.customerName
  })
  .from(orderItems)
  .innerJoin(
    orders,
    sql`orders.order_number = ${orderItems.orderNumber}`
  )
  .where(sql`product_code = ${productCode}`)
  .orderBy(sql`orders.order_date DESC`)
  .limit(10);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 font-[family-name:var(--font-geist-sans)]">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/products" className="text-blue-500 hover:text-blue-700">
          ← Back to Products
        </Link>
        <h1 className="text-3xl font-bold">Product Dashboard: {productDetails.productCode}</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Product Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500">Product Code</p>
            <p className="text-lg font-medium">{productDetails.productCode}</p>
          </div>
          <div>
            <p className="text-gray-500">Description</p>
            <p className="text-lg font-medium">{productDetails.productDescription}</p>
          </div>
          <div>
            <p className="text-gray-500">Average Unit Price</p>
            <p className="text-lg font-medium">${Number(productDetails.avgUnitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Orders</p>
            <p className="text-lg font-medium">{Number(productDetails.orderCount).toLocaleString()}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Quantity Sold</h2>
          <p className="text-3xl font-bold text-blue-600">{Number(productDetails.totalQuantity).toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Revenue</h2>
          <p className="text-3xl font-bold text-green-600">${Number(productDetails.totalRevenue).toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Average Order Value</h2>
          <p className="text-3xl font-bold text-purple-600">
            ${productDetails.orderCount > 0 
              ? Number(productDetails.totalRevenue / productDetails.orderCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
              : '0.00'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Monthly Sales Trend</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Month</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Revenue</th>
                  <th className="py-2 text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {salesByMonth.map((month, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{month.month}</td>
                    <td className="py-2 text-right">{Number(month.total_quantity).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(month.total_revenue).toLocaleString()}</td>
                    <td className="py-2 text-right">{month.order_count}</td>
                  </tr>
                ))}
                {salesByMonth.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">No monthly sales data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Order #</th>
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{order.orderNumber}</td>
                    <td className="py-2 text-left">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-2 text-left">{order.customerName}</td>
                    <td className="py-2 text-right">{Number(order.quantity).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(order.lineAmount).toLocaleString()}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">No recent orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
