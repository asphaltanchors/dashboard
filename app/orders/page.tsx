import { db } from "../../db";
import { sql } from "drizzle-orm";
import { orders, orderItems, customers, orderCompanyView } from "../../db/schema";
import { desc } from "drizzle-orm";

export default async function OrdersAnalytics() {
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

  // Query to get total number of orders and revenue
  const orderSummaryResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  }).from(orders);
  
  const totalOrders = orderSummaryResult[0]?.totalOrders || 0;
  const totalRevenue = orderSummaryResult[0]?.totalRevenue || 0;
  const avgOrderValue = orderSummaryResult[0]?.avgOrderValue || 0;

  // Query to get recent orders count (last 30 days)
  const recentOrdersResult = await db.select({
    totalOrders: sql<number>`count(*)`.as('total_orders'),
    totalRevenue: sql<number>`SUM(total_amount)`.as('total_revenue')
  })
  .from(orders)
  .where(sql`order_date >= ${formattedLast30Days}`);
  
  const recentOrdersCount = recentOrdersResult[0]?.totalOrders || 0;
  const recentRevenue = recentOrdersResult[0]?.totalRevenue || 0;

  // Query to get orders by status
  const ordersByStatus = await db.select({
    status: orders.status,
    count: sql<number>`count(*)`.as('count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount')
  })
  .from(orders)
  .groupBy(orders.status)
  .orderBy(sql`count DESC`);

  // Query to get orders by type
  const ordersByType = await db.select({
    orderType: orders.orderType,
    count: sql<number>`count(*)`.as('count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount')
  })
  .from(orders)
  .groupBy(orders.orderType)
  .orderBy(sql`count DESC`);

  // Query to get top customers by order count
  const topCustomersByOrders = await db.select({
    customerName: orders.customerName,
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalSpent: sql<number>`SUM(total_amount)`.as('total_spent'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orders)
  .groupBy(orders.customerName)
  .orderBy(sql`order_count DESC`)
  .limit(10);

  // Query to get top customers by revenue
  const topCustomersByRevenue = await db.select({
    customerName: orders.customerName,
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalSpent: sql<number>`SUM(total_amount)`.as('total_spent'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orders)
  .groupBy(orders.customerName)
  .orderBy(sql`total_spent DESC`)
  .limit(10);

  // Query to get orders by payment method
  const ordersByPaymentMethod = await db.select({
    paymentMethod: orders.paymentMethod,
    count: sql<number>`count(*)`.as('count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount')
  })
  .from(orders)
  .groupBy(orders.paymentMethod)
  .orderBy(sql`count DESC`);

  // Query to get orders by month (last 12 months)
  const ordersByMonth = await db.select({
    month: sql<string>`TO_CHAR(order_date, 'YYYY-MM')`.as('month'),
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalAmount: sql<number>`SUM(total_amount)`.as('total_amount'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orders)
  .groupBy(sql`month`)
  .orderBy(sql`month DESC`)
  .limit(12);

  // Define types for our custom queries
  type QuarterlyTrend = {
    quarter: string;
    order_count: number;
    total_amount: number;
    avg_order_value: number;
  };

  // Query to get quarterly trends
  const quarterlyTrendsResult = await db.execute(sql`
    SELECT 
      TO_CHAR(order_date, 'YYYY-"Q"Q') as quarter,
      COUNT(*) as order_count,
      SUM(total_amount) as total_amount,
      AVG(total_amount) as avg_order_value
    FROM orders
    GROUP BY quarter
    ORDER BY quarter DESC
    LIMIT 8
  `);
  
  // Cast the result to our type using double assertion
  const quarterlyTrends = quarterlyTrendsResult as unknown as QuarterlyTrend[];
  
  // Define type for recent orders
  type RecentOrder = {
    orderNumber: string;
    orderType: string;
    customerName: string;
    orderDate: Date | null;
    totalAmount: number;
    status: string;
    paymentMethod: string;
    poNumber: string | null;
  };
  
  // Query to get most recent orders list with company information
  const recentOrdersList = await db.select({
    orderNumber: orderCompanyView.orderNumber,
    customerName: orderCompanyView.customerName,
    orderDate: orderCompanyView.orderDate,
    totalAmount: orderCompanyView.totalAmount,
    companyName: orderCompanyView.companyName,
    companyDomain: orderCompanyView.companyDomain,
    matchType: orderCompanyView.matchType,
    confidence: orderCompanyView.confidence
  })
  .from(orderCompanyView)
  .orderBy(desc(orderCompanyView.orderDate))
  .limit(10);
  
  // Query to get top companies by order count
  const topCompaniesByOrders = await db.select({
    companyId: orderCompanyView.companyId,
    companyName: orderCompanyView.companyName,
    companyDomain: orderCompanyView.companyDomain,
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalSpent: sql<number>`SUM(total_amount)`.as('total_spent'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orderCompanyView)
  .groupBy(orderCompanyView.companyId, orderCompanyView.companyName, orderCompanyView.companyDomain)
  .orderBy(sql`order_count DESC`)
  .limit(10);
  
  // Query to get top companies by revenue
  const topCompaniesByRevenue = await db.select({
    companyId: orderCompanyView.companyId,
    companyName: orderCompanyView.companyName,
    companyDomain: orderCompanyView.companyDomain,
    orderCount: sql<number>`count(*)`.as('order_count'),
    totalSpent: sql<number>`SUM(total_amount)`.as('total_spent'),
    avgOrderValue: sql<number>`AVG(total_amount)`.as('avg_order_value')
  })
  .from(orderCompanyView)
  .groupBy(orderCompanyView.companyId, orderCompanyView.companyName, orderCompanyView.companyDomain)
  .orderBy(sql`total_spent DESC`)
  .limit(10);
  
  // Query to get match type distribution
  const matchTypeDistribution = await db.select({
    matchType: orderCompanyView.matchType,
    count: sql<number>`count(*)`.as('count'),
    avgConfidence: sql<number>`AVG(confidence)`.as('avg_confidence')
  })
  .from(orderCompanyView)
  .groupBy(orderCompanyView.matchType)
  .orderBy(sql`count DESC`);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-3xl font-bold mb-8">Orders Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Orders</h2>
          <p className="text-3xl font-bold text-blue-600">{totalOrders.toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Revenue</h2>
          <p className="text-3xl font-bold text-green-600">${Number(totalRevenue).toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Average Order Value</h2>
          <p className="text-3xl font-bold text-purple-600">${Number(avgOrderValue).toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Last 30 Days</h2>
          <p className="text-3xl font-bold text-amber-500">{recentOrdersCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">
            ${Number(recentRevenue).toLocaleString()} in revenue
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Orders by Status</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ordersByStatus.map((status, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{status.status || 'Unknown'}</td>
                    <td className="py-2 text-right">{status.count.toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(status.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Orders by Type</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ordersByType.map((type, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{type.orderType || 'Unknown'}</td>
                    <td className="py-2 text-right">{type.count.toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(type.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Customers by Orders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {topCustomersByOrders.map((customer, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{customer.customerName}</td>
                    <td className="py-2 text-right">{customer.orderCount.toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(customer.totalSpent).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Customers by Revenue</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-right">Total Spent</th>
                  <th className="py-2 text-right">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {topCustomersByRevenue.map((customer, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{customer.customerName}</td>
                    <td className="py-2 text-right">${Number(customer.totalSpent).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(customer.avgOrderValue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Monthly Order Trends</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Month</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ordersByMonth.map((month, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{month.month}</td>
                    <td className="py-2 text-right">{month.orderCount.toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(month.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quarterly Trends</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Quarter</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyTrends.map((quarter, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{quarter.quarter}</td>
                    <td className="py-2 text-right">{quarter.order_count.toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(quarter.total_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 text-left">Payment Method</th>
                <th className="py-2 text-right">Orders</th>
                <th className="py-2 text-right">Revenue</th>
                <th className="py-2 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {ordersByPaymentMethod.map((method, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  <td className="py-2 text-left font-medium">{method.paymentMethod || 'Unknown'}</td>
                  <td className="py-2 text-right">{method.count.toLocaleString()}</td>
                  <td className="py-2 text-right">${Number(method.totalAmount).toLocaleString()}</td>
                  <td className="py-2 text-right">
                    {((method.count / totalOrders) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Companies by Orders</h2>
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
          <h2 className="text-xl font-semibold mb-4">Top Companies by Revenue</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Company</th>
                  <th className="py-2 text-left">Domain</th>
                  <th className="py-2 text-right">Total Spent</th>
                  <th className="py-2 text-right">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {topCompaniesByRevenue.map((company, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{company.companyName}</td>
                    <td className="py-2 text-left text-gray-500">{company.companyDomain || '-'}</td>
                    <td className="py-2 text-right">${Number(company.totalSpent).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(company.avgOrderValue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Company Match Types</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 text-left">Match Type</th>
                <th className="py-2 text-right">Count</th>
                <th className="py-2 text-right">Percentage</th>
                <th className="py-2 text-right">Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              {matchTypeDistribution.map((type, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  <td className="py-2 text-left font-medium">{type.matchType || 'Unknown'}</td>
                  <td className="py-2 text-right">{type.count.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    {((type.count / totalOrders) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 text-right">
                    {type.avgConfidence ? (type.avgConfidence * 100).toFixed(1) + '%' : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Most Recent Orders with Company Data</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 text-left">Order #</th>
                <th className="py-2 text-left">Customer</th>
                <th className="py-2 text-left">Company</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Match Type</th>
                <th className="py-2 text-right">Confidence</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentOrdersList.map((order, index) => {
                // Format the date
                const orderDate = order.orderDate ? new Date(order.orderDate) : null;
                const formattedDate = orderDate ? 
                  orderDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  }) : 'N/A';
                
                // Format confidence as percentage
                const confidencePercent = order.confidence ? 
                  (order.confidence * 100).toFixed(1) + '%' : 'N/A';
                
                return (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{order.orderNumber}</td>
                    <td className="py-2 text-left">{order.customerName}</td>
                    <td className="py-2 text-left">
                      <div className="font-medium">{order.companyName}</div>
                      {order.companyDomain && (
                        <div className="text-xs text-gray-500">{order.companyDomain}</div>
                      )}
                    </td>
                    <td className="py-2 text-left">{formattedDate}</td>
                    <td className="py-2 text-left">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.matchType === 'exact' ? 'bg-green-100 text-green-800' :
                        order.matchType === 'fuzzy' ? 'bg-yellow-100 text-yellow-800' :
                        order.matchType === 'manual' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.matchType || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-2 text-right">{confidencePercent}</td>
                    <td className="py-2 text-right">${Number(order.totalAmount).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Key Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Average Order Value</h3>
            <p className="text-2xl font-bold text-blue-600">
              ${Number(avgOrderValue).toLocaleString()}
            </p>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Most Common Payment</h3>
            <p className="text-2xl font-bold text-green-600">
              {ordersByPaymentMethod.length > 0 ? ordersByPaymentMethod[0].paymentMethod : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {ordersByPaymentMethod.length > 0 ? 
                `${((ordersByPaymentMethod[0].count / totalOrders) * 100).toFixed(1)}% of orders` : ''}
            </p>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Most Common Order Type</h3>
            <p className="text-2xl font-bold text-purple-600">
              {ordersByType.length > 0 ? ordersByType[0].orderType : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              {ordersByType.length > 0 ? 
                `${((ordersByType[0].count / totalOrders) * 100).toFixed(1)}% of orders` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
