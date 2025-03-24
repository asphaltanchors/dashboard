import { db } from "../../../db";
import { sql } from "drizzle-orm";
import { orderItems, orders } from "../../../db/schema";
import Link from "next/link";

// Define product family information
const productFamilies = [
  {
    id: "sp10",
    name: "SP10 Asphalt Anchors",
    description: "6-inch asphalt anchors with various thread sizes and coatings. The SP10 is our most popular anchor for light to medium-duty applications. Available with 3/8\", M8, or M10 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    pattern: "01-6310%",
    image: "/sp10-family.jpg", // Placeholder
    features: [
      "6-inch length for secure anchoring in asphalt",
      "Available with 3/8\", M8, or M10 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 1,500 lbs in 3-inch thick asphalt",
      "Installs in minutes with common tools"
    ]
  },
  {
    id: "sp12",
    name: "SP12 Asphalt Anchors",
    description: "8-inch asphalt anchors with various thread sizes and coatings. The SP12 provides increased holding power for medium-duty applications. Available with 3/8\" or M10 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    pattern: "01-6315%",
    image: "/sp12-family.jpg", // Placeholder
    features: [
      "8-inch length for deeper anchoring in asphalt",
      "Available with 3/8\" or M10 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 2,000 lbs in 3-inch thick asphalt",
      "Ideal for medium-duty applications"
    ]
  },
  {
    id: "sp18",
    name: "SP18 Asphalt Anchors",
    description: "10-inch asphalt anchors with various thread sizes and coatings. The SP18 is designed for heavy-duty applications requiring maximum holding power. Available with 7/16\" or M12 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    pattern: "01-6318%",
    image: "/sp18-family.jpg", // Placeholder
    features: [
      "10-inch length for maximum anchoring depth",
      "Available with 7/16\" or M12 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 3,000 lbs in 3-inch thick asphalt",
      "Ideal for heavy-duty applications"
    ]
  },
  {
    id: "sp58",
    name: "SP58 Asphalt Anchors",
    description: "Heavy-duty 10-inch asphalt anchors with 5/8\" or M16 thread. The SP58 is our strongest anchor, designed for the most demanding applications. Available with 5/8\" or M16 threads and various coatings including zinc plated, stainless steel, and Dacromet.",
    pattern: "01-6358%",
    image: "/sp58-family.jpg", // Placeholder
    features: [
      "10-inch length with larger diameter for maximum strength",
      "Available with 5/8\" or M16 female threads",
      "Multiple coating options for different environments",
      "Typical pull-out strength of 4,000 lbs in 3-inch thick asphalt",
      "Our strongest anchor for the most demanding applications"
    ]
  },
  {
    id: "am625",
    name: "AM625 Asphalt Anchors",
    description: "Plastic asphalt anchors for lighter applications. The AM625 is a cost-effective solution for light-duty applications where metal anchors would be overkill. Made from high-strength engineering plastic with a 6\" length and 3/4\" diameter.",
    pattern: "01-7625%",
    image: "/am625-family.jpg", // Placeholder
    features: [
      "6-inch length plastic anchor for light-duty applications",
      "Cost-effective alternative to metal anchors",
      "Corrosion-proof design",
      "Easy installation with common tools",
      "Ideal for temporary installations or lighter loads"
    ]
  },
  {
    id: "epx",
    name: "EPX Anchoring Grouts",
    description: "Various epoxy and cement-based anchoring grouts for securing our anchors in asphalt. Our EPX series includes different formulations for various application needs and environmental conditions.",
    pattern: "82-%",
    image: "/epx-family.jpg", // Placeholder
    features: [
      "EPX2: Cement-based grout in various package sizes",
      "EPX3: Two-part epoxy in convenient cartridges",
      "EPX5: High-performance epoxy for extreme conditions",
      "Fast curing options available",
      "Formulations for different temperature ranges and environmental conditions"
    ]
  },
];

export default async function ProductFamilyDetail({
  params,
}: {
  params: { familyId: string };
}) {
  const familyId = params.familyId;
  
  // Find the family information
  const family = productFamilies.find(f => f.id === familyId);
  
  if (!family) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-8">Product Family Not Found</h1>
        <Link href="/product-families" className="text-blue-500 hover:text-blue-700">
          ← Back to Product Families
        </Link>
      </div>
    );
  }
  
  // Get current date and calculate dates for time-based queries
  const currentDate = new Date();
  const lastYearDate = new Date(currentDate);
  lastYearDate.setFullYear(currentDate.getFullYear() - 1);
  
  const last90DaysDate = new Date(currentDate);
  last90DaysDate.setDate(currentDate.getDate() - 90);
  
  const formattedLast90Days = last90DaysDate.toISOString().split('T')[0];
  
  // Define types for our data
  type Product = {
    product_code: string;
    product_description: string;
    total_sales: number;
    total_quantity: number;
    order_count: number;
    avg_unit_price: number;
  };
  
  type MonthlySales = {
    month: string;
    total_sales: number;
    total_quantity: number;
  };

  // Get all products in this family with sales data
  // Strip the " IN" suffix from product codes when grouping
  const productsResult = await db.execute(sql`
    SELECT 
      REGEXP_REPLACE(product_code, ' IN$', '') as product_code,
      product_description,
      SUM(line_amount) as total_sales,
      SUM(CAST(quantity AS NUMERIC)) as total_quantity,
      COUNT(DISTINCT order_number) as order_count,
      AVG(unit_price) as avg_unit_price
    FROM order_items
    WHERE product_code LIKE ${family.pattern}
    GROUP BY REGEXP_REPLACE(product_code, ' IN$', ''), product_description
    ORDER BY total_sales DESC
  `);
  
  // Cast the result to our Product type
  const products = productsResult as unknown as Product[];
  
  // Get total stats for this family
  const statsResult = await db.execute(sql`
    SELECT 
      SUM(oi.line_amount) as total_sales,
      SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity,
      COUNT(DISTINCT oi.order_number) as order_count,
      COUNT(DISTINCT o.customer_name) as customer_count
    FROM order_items oi
    INNER JOIN orders o ON oi.order_number = o.order_number
    WHERE oi.product_code LIKE ${family.pattern}
  `);
  
  const stats = Array.isArray(statsResult) && statsResult.length > 0
    ? {
        totalSales: Number(statsResult[0].total_sales || 0),
        totalQuantity: Number(statsResult[0].total_quantity || 0),
        orderCount: Number(statsResult[0].order_count || 0),
        customerCount: Number(statsResult[0].customer_count || 0)
      }
    : { 
        totalSales: 0, 
        totalQuantity: 0, 
        orderCount: 0, 
        customerCount: 0 
      };
  

  // Get monthly sales trend for this family
  const monthlySalesResult = await db.execute(sql`
    SELECT 
      TO_CHAR(o.order_date, 'YYYY-MM') as month,
      SUM(oi.line_amount) as total_sales,
      SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity
    FROM order_items oi
    INNER JOIN orders o ON oi.order_number = o.order_number
    WHERE oi.product_code LIKE ${family.pattern}
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);
  
  // Cast the result to our type
  const monthlySales = monthlySalesResult as unknown as MonthlySales[];
  
  // Get recent orders for this family
  const recentOrders = await db.select({
    orderNumber: orderItems.orderNumber,
    orderDate: orders.orderDate,
    productCode: orderItems.productCode,
    productDescription: orderItems.productDescription,
    quantity: orderItems.quantity,
    lineAmount: orderItems.lineAmount,
    customerName: orders.customerName
  })
  .from(orderItems)
  .innerJoin(
    orders,
    sql`${orderItems.orderNumber} = ${orders.orderNumber}`
  )
  .where(sql`product_code LIKE ${family.pattern}`)
  .orderBy(sql`${orders.orderDate} DESC`)
  .limit(10);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 font-[family-name:var(--font-geist-sans)]">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/product-families" className="text-blue-500 hover:text-blue-700">
          ← Back to Product Families
        </Link>
        <h1 className="text-3xl font-bold">{family.name}</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Family Overview</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{family.description}</p>
        
        <h3 className="text-lg font-medium mb-2">Key Features</h3>
        <ul className="list-disc pl-5 mb-6 text-gray-700 dark:text-gray-300">
          {family.features.map((feature, index) => (
            <li key={index} className="mb-1">{feature}</li>
          ))}
        </ul>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold text-blue-600">${Number(stats.totalSales).toLocaleString()}</p>
          </div>
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500">Units Sold</p>
            <p className="text-2xl font-bold text-green-600">{Number(stats.totalQuantity).toLocaleString()}</p>
          </div>
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-purple-600">{Number(stats.orderCount).toLocaleString()}</p>
          </div>
          <div className="border dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500">Unique Customers</p>
            <p className="text-2xl font-bold text-amber-600">{Number(stats.customerCount).toLocaleString()}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Products in this Family</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-right">Avg. Price</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Sales</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(products) && products.map((product, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left">
                      <Link href={`/products/${encodeURIComponent(product.product_code || '')}`} className="font-medium text-blue-500 hover:text-blue-700 hover:underline">
                        {product.product_code}
                      </Link>
                      <div className="text-sm text-gray-500">{product.product_description}</div>
                    </td>
                    <td className="py-2 text-right">${Number(product.avg_unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right">{Number(product.total_quantity).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(product.total_sales).toLocaleString()}</td>
                  </tr>
                ))}
                {(!Array.isArray(products) || products.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">No products found in this family</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Monthly Sales Trend</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 text-left">Month</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Sales</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(monthlySales) && monthlySales.map((month: any, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="py-2 text-left font-medium">{month.month}</td>
                    <td className="py-2 text-right">{Number(month.total_quantity || 0).toLocaleString()}</td>
                    <td className="py-2 text-right">${Number(month.total_sales || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {monthlySales.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">No monthly sales data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 text-left">Order #</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Customer</th>
                <th className="py-2 text-left">Product</th>
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
                  <td className="py-2 text-left">
                    <div>{order.productCode}</div>
                    <div className="text-sm text-gray-500">{order.productDescription}</div>
                  </td>
                  <td className="py-2 text-right">{Number(order.quantity).toLocaleString()}</td>
                  <td className="py-2 text-right">${Number(order.lineAmount).toLocaleString()}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">No recent orders</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
