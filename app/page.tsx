import Link from "next/link";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { orders, products, orderItems, companies, customers, itemHistoryView, orderCompanyView } from "../db/schema";
import RevenueChart from "./components/RevenueChart";

export default async function Dashboard() {
  // Get current date and calculate dates for time-based queries
  const currentDate = new Date();
  const last30DaysDate = new Date(currentDate);
  last30DaysDate.setDate(currentDate.getDate() - 30);
  
  const last90DaysDate = new Date(currentDate);
  last90DaysDate.setDate(currentDate.getDate() - 90);
  
  const formattedLast30Days = last30DaysDate.toISOString().split('T')[0];
  const formattedLast90Days = last90DaysDate.toISOString().split('T')[0];

  // Query to get total orders and revenue
  const orderSummaryResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  }).from(orders);
  
  const totalOrders = orderSummaryResult[0]?.totalOrders || 0;
  const totalRevenue = orderSummaryResult[0]?.totalRevenue || 0;
  const avgOrderValue = orderSummaryResult[0]?.avgOrderValue || 0;

  // Query to get recent orders (last 30 days)
  const recentOrdersResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue')
  })
  .from(orders)
  .where(sql`order_date >= ${formattedLast30Days}`);
  
  const recentOrdersCount = recentOrdersResult[0]?.totalOrders || 0;
  const recentRevenue = recentOrdersResult[0]?.totalRevenue || 0;

  // Query to get total products
  const totalProductsResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(products);
  
  const totalProducts = totalProductsResult[0]?.count || 0;

  // Query to get products with missing descriptions
  const missingDescriptionsResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(products)
  .where(sql`sales_description = '' OR sales_description IS NULL`);
  
  const missingDescriptions = missingDescriptionsResult[0]?.count || 0;

  // Query to get top selling products (last 90 days)
  const topSellingProducts = await db.select({
    productCode: orderItems.productCode,
    productDescription: orderItems.productDescription,
    totalQuantity: sql<number>`SUM(CAST(quantity AS NUMERIC))`.as('total_quantity'),
    totalRevenue: sql<number>`SUM(line_amount)`.as('total_revenue')
  })
  .from(orderItems)
  .innerJoin(
    sql`orders`,
    sql`orders.order_number = ${orderItems.orderNumber}`
  )
  .where(sql`quantity IS NOT NULL AND CAST(quantity AS NUMERIC) > 0 AND orders.order_date >= ${formattedLast90Days}`)
  .groupBy(orderItems.productCode, orderItems.productDescription)
  .orderBy(sql`total_quantity DESC`)
  .limit(5);

  // Query to get recent orders list
  const recentOrders = await db.select({
    orderNumber: orders.orderNumber,
    customerName: orders.customerName,
    orderDate: orders.orderDate,
    totalAmount: orders.totalAmount,
    status: orders.status
  })
  .from(orders)
  .orderBy(sql`order_date DESC`)
  .limit(5);

  // Query to get orders by status
  const ordersByStatus = await db.select({
    status: orders.status,
    count: sql<number>`count(*)`.as('count')
  })
  .from(orders)
  .groupBy(orders.status)
  .orderBy(sql`count DESC`);
  
  // Query to get orders by month (all time)
  const ordersByMonth = await db.select({
    month: sql<string>`TO_CHAR(order_date, 'YYYY-MM')`.as('month'),
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orders)
  .groupBy(sql`month`)
  .orderBy(sql`month ASC`);
  
  // Query to get top companies by order count
  const topCompaniesByOrders = await db.select({
    companyId: orderCompanyView.companyId,
    companyName: orderCompanyView.companyName,
    companyDomain: orderCompanyView.companyDomain,
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalSpent: sql<number>`SUM(total_amount)`.as('total_spent')
  })
  .from(orderCompanyView)
  .groupBy(orderCompanyView.companyId, orderCompanyView.companyName, orderCompanyView.companyDomain)
  .orderBy(sql`order_count DESC`)
  .limit(5);
  
  // Query to get recent product changes
  const recentProductChanges = await db.select({
    itemName: itemHistoryView.itemName,
    salesDescription: itemHistoryView.salesDescription,
    columnName: itemHistoryView.columnName,
    oldValue: itemHistoryView.oldValue,
    newValue: itemHistoryView.newValue,
    changedAt: itemHistoryView.changedAt,
    percentChange: itemHistoryView.percentChange
  })
  .from(itemHistoryView)
  .orderBy(sql`changed_at DESC`)
  .limit(5);
  
  // Query to get customer types distribution
  const customerTypeDistribution = await db.select({
    customerType: customers.customerType,
    count: sql<number>`count(*)`.as('count')
  })
  .from(customers)
  .groupBy(customers.customerType)
  .orderBy(sql`count DESC`);
  
  // Query to get company match type distribution
  const companyMatchDistribution = await db.select({
    matchType: orderCompanyView.matchType,
    count: sql<number>`count(*)`.as('count'),
    avgConfidence: sql<number>`AVG(confidence)`.as('avg_confidence')
  })
  .from(orderCompanyView)
  .groupBy(orderCompanyView.matchType)
  .orderBy(sql`count DESC`);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 font-[family-name:var(--font-geist-sans)]">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Orders</h2>
          <p className="text-3xl font-bold text-blue-600">{totalOrders.toLocaleString()}</p>
          <div className="mt-2 text-sm text-gray-500">
            <span className="text-green-500 font-medium">+{recentOrdersCount}</span> in last 30 days
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Revenue</h2>
          <p className="text-3xl font-bold text-green-600">${Number(totalRevenue).toLocaleString()}</p>
          <div className="mt-2 text-sm text-gray-500">
            <span className="text-green-500 font-medium">+${Number(recentRevenue).toLocaleString()}</span> in last 30 days
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Products</h2>
          <p className="text-3xl font-bold text-purple-600">{totalProducts.toLocaleString()}</p>
          <div className="mt-2 text-sm text-gray-500">
            <span className="text-amber-500 font-medium">{missingDescriptions}</span> missing descriptions
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Avg Order Value</h2>
          <p className="text-3xl font-bold text-amber-500">${Number(avgOrderValue).toLocaleString()}</p>
        </div>
      </div>
      
      {/* Recent Orders and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Link href="/orders" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Order #</th>
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  // Format the date
                  const orderDate = order.orderDate ? new Date(order.orderDate) : null;
                  const formattedDate = orderDate ? 
                    orderDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'N/A';
                  
                  return (
                    <tr key={order.orderNumber} className="border-b dark:border-gray-700">
                      <td className="py-2 text-left font-medium">{order.orderNumber}</td>
                      <td className="py-2 text-left">{order.customerName}</td>
                      <td className="py-2 text-left">{formattedDate}</td>
                      <td className="py-2 text-left">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2 text-right">${Number(order.totalAmount).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Top Selling Products</h2>
            <div className="flex gap-4">
              <Link href="/product-families" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                View Families
              </Link>
              <Link href="/products" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topSellingProducts.map((product, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left">
                      <Link href={`/products/${encodeURIComponent(product.productCode || '')}`} className="font-medium text-blue-600 hover:text-blue-800">
                        {product.productCode}
                      </Link>
                      <div className="text-sm text-gray-500">{product.productDescription}</div>
                    </td>
                    <td className="py-2 text-right">{Number(product.totalQuantity).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(product.totalRevenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All-Time Revenue Trends</h2>
        </div>
        <div className="h-80">
          <RevenueChart data={ordersByMonth} />
        </div>
      </div>
      
      {/* Top Companies and Recent Product Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Top Companies</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Company</th>
                  <th className="py-2 text-left">Domain</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {topCompaniesByOrders.map((company, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{company.companyName}</td>
                    <td className="py-2 text-left text-gray-500">{company.companyDomain || '-'}</td>
                    <td className="py-2 text-right">{company.orderCount.toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(company.totalSpent).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Product Updates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-left">Field</th>
                  <th className="py-2 text-left">Change</th>
                  <th className="py-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentProductChanges.map((change, index) => {
                  // Format the date
                  const changeDate = change.changedAt ? new Date(change.changedAt) : null;
                  const formattedDate = changeDate ? 
                    changeDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'N/A';
                  
                  return (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="py-2 text-left">
                        <div className="font-medium">{change.itemName}</div>
                        <div className="text-xs text-gray-500">{change.salesDescription}</div>
                      </td>
                      <td className="py-2 text-left">{change.columnName}</td>
                      <td className="py-2 text-left">
                        <div className="text-xs">
                          <span className="text-gray-500">From:</span> {change.oldValue || 'N/A'}
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">To:</span> {change.newValue || 'N/A'}
                        </div>
                        {change.percentChange && (
                          <div className={`text-xs font-medium ${Number(change.percentChange) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(change.percentChange) > 0 ? '+' : ''}{change.percentChange}%
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right text-sm text-gray-500">{formattedDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Customer and Company Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Customer Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {customerTypeDistribution.map((type, index) => (
              <div key={index} className="border dark:border-gray-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {type.count}
                </div>
                <div className="text-sm text-gray-500 mt-1">{type.customerType || 'Unknown'}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Company Match Quality</h2>
          <div className="grid grid-cols-2 gap-4">
            {companyMatchDistribution.map((match, index) => (
              <div key={index} className="border dark:border-gray-700 rounded-lg p-4 text-center">
                <div className={`text-2xl font-bold ${
                  match.matchType === 'exact' ? 'text-green-600' :
                  match.matchType === 'fuzzy' ? 'text-yellow-600' :
                  match.matchType === 'manual' ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {match.count}
                </div>
                <div className="text-sm text-gray-500 mt-1">{match.matchType || 'Unknown'}</div>
                {match.avgConfidence && (
                  <div className="text-xs text-gray-500 mt-1">
                    Avg. Confidence: {(match.avgConfidence * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Order Status and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Orders by Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ordersByStatus.map((status, index) => (
              <div key={index} className="border dark:border-gray-700 rounded-lg p-4 text-center">
                <div className={`text-2xl font-bold ${
                  status.status === 'Completed' ? 'text-green-600' :
                  status.status === 'Pending' ? 'text-yellow-600' :
                  status.status === 'Processing' ? 'text-blue-600' :
                  status.status === 'Cancelled' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {status.count}
                </div>
                <div className="text-sm text-gray-500 mt-1">{status.status || 'Unknown'}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/products" className="block w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors">
              View All Products
            </Link>
            <Link href="/product-families" className="block w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors">
              View Product Families
            </Link>
            <Link href="/orders" className="block w-full py-2 px-4 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg transition-colors">
              View All Orders
            </Link>
            <Link href="#" className="block w-full py-2 px-4 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg transition-colors">
              Generate Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
