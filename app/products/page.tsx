import { db } from "../../db";
import { sql } from "drizzle-orm";
import { products, orderItems, orders } from "../../db/schema";
import Link from "next/link";

export default async function ProductsAnalytics() {
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

  // Query to get total number of products
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

  // Query to get top selling products by quantity (last 90 days)
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
  .limit(10);

  // Query to get sales by month (last 12 months)
  const salesByMonth = await db.select({
    month: sql<string>`TO_CHAR(order_date, 'YYYY-MM')`.as('month'),
    totalSales: sql<number>`SUM(total_amount)`.as('total_sales'),
    orderCount: sql<number>`COUNT(*)`.as('order_count')
  })
  .from(orders)
  .groupBy(sql`month`)
  .orderBy(sql`month DESC`)
  .limit(12);
  
  // Define types for our custom queries
  type GrowingProduct = {
    product_code: string;
    product_description: string;
    current_quantity: number;
    previous_quantity: number | null;
    current_revenue: number;
    previous_revenue: number | null;
    growth_percent: number;
  };

  type DayRevenue = {
    day_of_week: number;
    day_name: string;
    total_revenue: number;
    order_count: number;
  };

  type AvgProductsResult = {
    avg_products: number;
  };

  // Query to get products with fastest growing sales (comparing last 30 days vs previous 30 days)
  const growingProductsResult = await db.execute(sql`
    WITH last_30_days AS (
      SELECT 
        oi.product_code,
        oi.product_description,
        SUM(CAST(oi.quantity AS NUMERIC)) as quantity,
        SUM(oi.line_amount) as revenue
      FROM order_items oi
      JOIN orders o ON o.order_number = oi.order_number
      WHERE o.order_date >= ${formattedLast30Days}
      GROUP BY oi.product_code, oi.product_description
    ),
    previous_30_days AS (
      SELECT 
        oi.product_code,
        SUM(CAST(oi.quantity AS NUMERIC)) as quantity,
        SUM(oi.line_amount) as revenue
      FROM order_items oi
      JOIN orders o ON o.order_number = oi.order_number
      WHERE o.order_date >= ${formattedLast90Days} AND o.order_date < ${formattedLast30Days}
      GROUP BY oi.product_code
    )
    SELECT 
      l.product_code,
      l.product_description,
      l.quantity as current_quantity,
      p.quantity as previous_quantity,
      l.revenue as current_revenue,
      p.revenue as previous_revenue,
      CASE 
        WHEN p.quantity = 0 OR p.quantity IS NULL THEN 100
        ELSE ROUND((l.quantity - p.quantity) / p.quantity * 100, 1)
      END as growth_percent
    FROM last_30_days l
    LEFT JOIN previous_30_days p ON l.product_code = p.product_code
    WHERE l.quantity > 0 AND (p.quantity = 0 OR p.quantity IS NULL OR l.quantity > p.quantity)
    ORDER BY growth_percent DESC, l.quantity DESC
    LIMIT 5
  `);
  
  // Cast the result to our type using double assertion
  const growingProducts = growingProductsResult as unknown as GrowingProduct[];
  
  // Query to get average products per order
  const avgProductsPerOrderResult = await db.execute(sql`
    SELECT AVG(product_count) as avg_products
    FROM (
      SELECT order_id, COUNT(*) as product_count
      FROM order_items
      GROUP BY order_id
    ) as order_counts
  `);
  
  // Cast the result to our type using double assertion
  const avgProductsPerOrder = avgProductsPerOrderResult as unknown as AvgProductsResult[];
  
  // Query to get revenue by day of week
  const revenueByDayOfWeekResult = await db.execute(sql`
    SELECT 
      EXTRACT(DOW FROM order_date) as day_of_week,
      TO_CHAR(order_date, 'Day') as day_name,
      SUM(total_amount) as total_revenue,
      COUNT(*) as order_count
    FROM orders
    WHERE order_date >= ${formattedLastYear}
    GROUP BY day_of_week, day_name
    ORDER BY day_of_week
  `);
  
  // Cast the result to our type using double assertion
  const revenueByDayOfWeek = revenueByDayOfWeekResult as unknown as DayRevenue[];
  
  // Query to get all products that had sales with total sales amount
  const productsWithSales = await db.select({
    productCode: orderItems.productCode,
    productDescription: orderItems.productDescription,
    totalSales: sql<number>`SUM(line_amount)`.as('total_sales')
  })
  .from(orderItems)
  .where(sql`product_code IS NOT NULL`)
  .groupBy(orderItems.productCode, orderItems.productDescription)
  .orderBy(sql`total_sales DESC`);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-3xl font-bold mb-8">Products Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Products</h2>
          <p className="text-3xl font-bold text-blue-600">{totalProducts}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Missing Descriptions</h2>
          <p className="text-3xl font-bold text-amber-500">{missingDescriptions}</p>
          <p className="text-sm text-gray-500 mt-1">
            {((missingDescriptions / totalProducts) * 100).toFixed(1)}% of products
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Top Product Revenue (90 Days)</h2>
          {topSellingProducts.length > 0 ? (
            <p className="text-3xl font-bold text-purple-600">
              ${Number(topSellingProducts[0].totalRevenue).toLocaleString()}
            </p>
          ) : (
            <p className="text-3xl font-bold text-purple-600">$0</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            From {topSellingProducts.length > 0 ? topSellingProducts[0].productCode : 'N/A'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Selling Products (Last 90 Days)</h2>
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
                      <div className="font-medium">{product.productCode}</div>
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
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Fastest Growing Products (Last 30 Days)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-right">Growth</th>
                  <th className="py-2 text-right">Current Qty</th>
                  <th className="py-2 text-right">Previous Qty</th>
                </tr>
              </thead>
              <tbody>
                {growingProducts.map((product, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left">
                      <div className="font-medium">{product.product_code}</div>
                      <div className="text-sm text-gray-500">{product.product_description}</div>
                    </td>
                    <td className="py-2 text-right text-green-600 font-medium">
                      +{product.growth_percent}%
                    </td>
                    <td className="py-2 text-right">{Number(product.current_quantity).toLocaleString()}</td>
                    <td className="py-2 text-right">{Number(product.previous_quantity || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {salesByMonth.map((month, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{month.month}</td>
                    <td className="py-2 text-right">{month.orderCount}</td>
                    <td className="py-2 text-right">${Number(month.totalSales).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Revenue by Day of Week (Last Year)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Day</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenueByDayOfWeek.map((day, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{day.day_name.trim()}</td>
                    <td className="py-2 text-right">{day.order_count}</td>
                    <td className="py-2 text-right">${Number(day.total_revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Key Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Average Products Per Order</h3>
            <p className="text-2xl font-bold text-blue-600">
              {avgProductsPerOrder[0]?.avg_products ? Number(avgProductsPerOrder[0].avg_products).toFixed(2) : 'N/A'}
            </p>
          </div>
          
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Data Quality</h3>
            <p className="text-2xl font-bold text-amber-500">
              {((missingDescriptions / totalProducts) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Products missing descriptions</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Products With Sales</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 text-left">Product Code</th>
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-right">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {productsWithSales.map((product, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  <td className="py-2 text-left font-medium">
                    {product.productCode ? (
                      <Link href={`/products/${encodeURIComponent(product.productCode)}`} className="text-blue-500 hover:text-blue-700 hover:underline">
                        {product.productCode}
                      </Link>
                    ) : (
                      <span>Unknown</span>
                    )}
                  </td>
                  <td className="py-2 text-left">{product.productDescription}</td>
                  <td className="py-2 text-right">${Number(product.totalSales).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
