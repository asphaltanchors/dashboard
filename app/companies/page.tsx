import { db } from "../../db";
import { sql } from "drizzle-orm";
import { companies, companyOrderMapping, customers, orders } from "../../db/schema";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { getDateRangeFromTimeFrame, TimeFrameValue } from "../utils/dates";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Wait for searchParams to be available
  const params = await searchParams;
  
  // Get timeframe from query params or default to 30d
  const timeFrame = (params.timeframe as TimeFrameValue) || '30d';
  const startDateParam = params.start as string | undefined;
  const endDateParam = params.end as string | undefined;
  
  // Calculate date ranges based on the selected timeframe
  const {
    startDate,
    endDate,
    formattedStartDate,
    formattedEndDate
  } = getDateRangeFromTimeFrame(timeFrame, startDateParam, endDateParam);
  
  // Create a user-friendly description of the date range
  const dateRangeText = timeFrame === 'custom'
    ? `Custom range: ${formattedStartDate} to ${formattedEndDate}`
    : timeFrame === 'all'
    ? 'All time'
    : timeFrame === 'ytd'
    ? `Year to date (from ${formattedStartDate})`
    : `From ${formattedStartDate} to ${formattedEndDate}`;
    
  // For backward compatibility with existing queries that use specific time windows
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

  // Query to get total number of companies
  const totalCompaniesResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  }).from(companies);
  
  const totalCompanies = totalCompaniesResult[0]?.count || 0;

  // Query to get companies with customers
  const companiesWithCustomersResult = await db.select({
    count: sql<number>`count(DISTINCT ${companies.companyId})`.as('count')
  })
  .from(companies)
  .innerJoin(customers, sql`${companies.companyId} = ${customers.companyId}`);
  
  const companiesWithCustomers = companiesWithCustomersResult[0]?.count || 0;

  // Query to get companies with orders
  const companiesWithOrdersResult = await db.select({
    count: sql<number>`count(DISTINCT ${companies.companyId})`.as('count')
  })
  .from(companies)
  .innerJoin(companyOrderMapping, sql`${companies.companyId} = ${companyOrderMapping.companyId}`);
  
  const companiesWithOrders = companiesWithOrdersResult[0]?.count || 0;

  // Query to get new companies in the selected time frame
  const newCompaniesResult = await db.select({
    count: sql<number>`count(*)`.as('count')
  })
  .from(companies)
  .where(sql`created_at >= ${formattedStartDate} AND created_at <= ${formattedEndDate}`);
  
  const newCompanies = newCompaniesResult[0]?.count || 0;

  // Query to get top companies by revenue in the selected time frame
  const topCompaniesByRevenue = await db.select({
    companyId: companies.companyId,
    companyName: companies.companyName,
    companyDomain: companies.companyDomain,
    customerCount: sql<number>`count(DISTINCT ${customers.quickbooksId})`.as('customer_count'),
    orderCount: sql<number>`count(DISTINCT ${companyOrderMapping.orderNumber})`.as('order_count'),
    totalRevenue: sql<number>`SUM(${orders.totalAmount})`.as('total_revenue')
  })
  .from(companies)
  .leftJoin(customers, sql`${companies.companyId} = ${customers.companyId}`)
  .leftJoin(companyOrderMapping, sql`${companies.companyId} = ${companyOrderMapping.companyId}`)
  .leftJoin(orders, sql`${companyOrderMapping.orderNumber} = ${orders.orderNumber} 
    AND ${orders.orderDate} >= ${formattedStartDate} 
    AND ${orders.orderDate} <= ${formattedEndDate}`)
  .groupBy(companies.companyId, companies.companyName, companies.companyDomain)
  .orderBy(sql`total_revenue DESC NULLS LAST`)
  .limit(10);

  // Query to get top companies by customer count
  const topCompaniesByCustomers = await db.select({
    companyId: companies.companyId,
    companyName: companies.companyName,
    companyDomain: companies.companyDomain,
    customerCount: sql<number>`count(DISTINCT ${customers.quickbooksId})`.as('customer_count')
  })
  .from(companies)
  .leftJoin(customers, sql`${companies.companyId} = ${customers.companyId}`)
  .groupBy(companies.companyId, companies.companyName, companies.companyDomain)
  .having(sql`count(DISTINCT ${customers.quickbooksId}) > 0`)
  .orderBy(sql`customer_count DESC`)
  .limit(10);

  // Query to get recent companies (sorted by creation date)
  const recentCompanies = await db.select({
    companyId: companies.companyId,
    companyName: companies.companyName,
    companyDomain: companies.companyDomain,
    createdAt: companies.createdAt
  })
  .from(companies)
  .orderBy(sql`created_at DESC`)
  .limit(10);

  // Query to get recent orders by company in the selected time frame
  const recentCompanyOrders = await db.select({
    companyId: companies.companyId,
    companyName: companies.companyName, 
    orderNumber: orders.orderNumber,
    orderDate: orders.orderDate,
    totalAmount: orders.totalAmount,
    customerName: orders.customerName
  })
  .from(companies)
  .innerJoin(companyOrderMapping, sql`${companies.companyId} = ${companyOrderMapping.companyId}`)
  .innerJoin(orders, sql`${companyOrderMapping.orderNumber} = ${orders.orderNumber} 
    AND ${orders.orderDate} >= ${formattedStartDate} 
    AND ${orders.orderDate} <= ${formattedEndDate}`)
  .orderBy(sql`${orders.orderDate} DESC`)
  .limit(10);

  return (
    <DashboardLayout 
      title="Companies Analytics"
      dateRangeText={dateRangeText}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Companies</h2>
          <p className="text-3xl font-bold text-blue-600">{totalCompanies.toLocaleString()}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Companies with Orders</h2>
          <p className="text-3xl font-bold text-green-600">{companiesWithOrders.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">
            {((companiesWithOrders / totalCompanies) * 100).toFixed(1)}% of total
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">New Companies (30 days)</h2>
          <p className="text-3xl font-bold text-purple-600">{newCompanies.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">
            {((newCompanies / totalCompanies) * 100).toFixed(1)}% growth
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Companies by Revenue</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Company</th>
                  <th className="py-2 text-right">Customers</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCompaniesByRevenue.map((company, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left">
                      <div className="font-medium">{company.companyName}</div>
                      <div className="text-sm text-gray-500">{company.companyDomain}</div>
                    </td>
                    <td className="py-2 text-right">{Number(company.customerCount).toLocaleString()}</td>
                    <td className="py-2 text-right">{Number(company.orderCount).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(company.totalRevenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Companies by Customer Count</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Company</th>
                  <th className="py-2 text-left">Domain</th>
                  <th className="py-2 text-right">Customers</th>
                </tr>
              </thead>
              <tbody>
                {topCompaniesByCustomers.map((company, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{company.companyName}</td>
                    <td className="py-2 text-left text-gray-500">{company.companyDomain}</td>
                    <td className="py-2 text-right">{Number(company.customerCount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recently Added Companies</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Company</th>
                  <th className="py-2 text-left">Domain</th>
                  <th className="py-2 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody>
                {recentCompanies.map((company, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{company.companyName}</td>
                    <td className="py-2 text-left text-gray-500">{company.companyDomain}</td>
                    <td className="py-2 text-right">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Company Orders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Company</th>
                  <th className="py-2 text-left">Order #</th>
                  <th className="py-2 text-right">Date</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentCompanyOrders.map((order, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{order.companyName}</td>
                    <td className="py-2 text-left">
                      <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`} className="text-blue-500 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2 text-right">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right">${Number(order.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Companies Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Companies with Customers</h3>
            <p className="text-2xl font-bold text-blue-600">
              {((companiesWithCustomers / totalCompanies) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">
              {companiesWithCustomers.toLocaleString()} out of {totalCompanies.toLocaleString()} companies
            </p>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Companies with Orders</h3>
            <p className="text-2xl font-bold text-green-600">
              {((companiesWithOrders / totalCompanies) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">
              {companiesWithOrders.toLocaleString()} out of {totalCompanies.toLocaleString()} companies
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}