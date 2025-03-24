import { db } from "../../db";
import { sql } from "drizzle-orm";
import { orderItems, orders } from "../../db/schema";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { getDateRangeFromTimeFrame } from "../utils/dates";

// Define product family information
const productFamilies = [
  {
    id: "sp10",
    name: "SP10 Asphalt Anchors",
    description: "6-inch asphalt anchors with various thread sizes and coatings",
    pattern: "01-6310%",
    image: "/sp10-family.jpg", // Placeholder - would need to add actual image
  },
  {
    id: "sp12",
    name: "SP12 Asphalt Anchors",
    description: "8-inch asphalt anchors with various thread sizes and coatings",
    pattern: "01-6315%",
    image: "/sp12-family.jpg", // Placeholder
  },
  {
    id: "sp18",
    name: "SP18 Asphalt Anchors",
    description: "10-inch asphalt anchors with various thread sizes and coatings",
    pattern: "01-6318%",
    image: "/sp18-family.jpg", // Placeholder
  },
  {
    id: "sp58",
    name: "SP58 Asphalt Anchors",
    description: "Heavy-duty 10-inch asphalt anchors with 5/8\" or M16 thread",
    pattern: "01-6358%",
    image: "/sp58-family.jpg", // Placeholder
  },
  {
    id: "am625",
    name: "AM625 Asphalt Anchors",
    description: "Plastic asphalt anchors for lighter applications",
    pattern: "01-7625%",
    image: "/am625-family.jpg", // Placeholder
  },
  {
    id: "epx",
    name: "EPX Anchoring Grouts",
    description: "Various epoxy and cement-based anchoring grouts",
    pattern: "82-%",
    image: "/epx-family.jpg", // Placeholder
  },
];

export default async function ProductFamilies({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Wait for searchParams to be available
  const params = await searchParams || {};
  
  // Get timeframe from URL params or default to 30d
  const timeFrame = (params.timeframe as string) || '30d';
  const startDateParam = params.start as string | undefined;
  const endDateParam = params.end as string | undefined;
  
  // Calculate date range based on the selected time frame
  const {
    startDate,
    endDate,
    formattedStartDate,
    formattedEndDate
  } = getDateRangeFromTimeFrame(timeFrame, startDateParam, endDateParam);
  
  // Format date range for display
  const formattedStartDisplay = startDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const formattedEndDisplay = endDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  // Create date range text for display
  const dateRangeText = `Showing data from ${formattedStartDisplay} to ${formattedEndDisplay}`;

  // For each family, get the count of products and total sales
  const familyStats = await Promise.all(
    productFamilies.map(async (family) => {
      // Get product count and total sales for this family
      // Strip the " IN" suffix from product codes when counting distinct products
      const statsResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT REGEXP_REPLACE(oi.product_code, ' IN$', '')) as product_count,
          SUM(oi.line_amount) as total_sales,
          SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity
        FROM order_items oi
        JOIN orders o ON oi.order_number = o.order_number
        WHERE oi.product_code LIKE ${family.pattern}
        AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
      `);
      
      const stats = Array.isArray(statsResult) && statsResult.length > 0
        ? {
            productCount: Number(statsResult[0].product_count || 0),
            totalSales: Number(statsResult[0].total_sales || 0),
            totalQuantity: Number(statsResult[0].total_quantity || 0)
          }
        : { productCount: 0, totalSales: 0, totalQuantity: 0 };
      
      // Get top selling product in this family
      // Strip the " IN" suffix from product codes when grouping
      const topProductResult = await db.execute(sql`
        SELECT 
          REGEXP_REPLACE(oi.product_code, ' IN$', '') as product_code,
          oi.product_description,
          SUM(oi.line_amount) as total_sales
        FROM order_items oi
        JOIN orders o ON oi.order_number = o.order_number
        WHERE oi.product_code LIKE ${family.pattern}
        AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
        GROUP BY REGEXP_REPLACE(oi.product_code, ' IN$', ''), oi.product_description
        ORDER BY total_sales DESC
        LIMIT 1
      `);
      
      const topProduct = Array.isArray(topProductResult) && topProductResult.length > 0 
        ? topProductResult[0] 
        : null;
      
      // Get all products in this family
      // Strip the " IN" suffix from product codes when grouping
      const products = await db.execute(sql`
        SELECT
          REGEXP_REPLACE(oi.product_code, ' IN$', '') as product_code,
          oi.product_description,
          SUM(oi.line_amount) as total_sales,
          SUM(CAST(oi.quantity AS NUMERIC)) as total_quantity
        FROM order_items oi
        JOIN orders o ON oi.order_number = o.order_number
        WHERE oi.product_code LIKE ${family.pattern}
        AND o.order_date BETWEEN ${formattedStartDate} AND ${formattedEndDate}
        GROUP BY REGEXP_REPLACE(oi.product_code, ' IN$', ''), oi.product_description
        ORDER BY total_sales DESC
      `);
      
      return {
        ...family,
        stats,
        topProduct,
        products,
      };
    })
  );

  return (
    <DashboardLayout
      title="Product Families"
      dateRangeText={dateRangeText}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {familyStats.map((family) => (
          <div key={family.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">{family.name}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{family.description}</p>
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Products</p>
                <p className="text-lg font-semibold">{family.stats.productCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-lg font-semibold">${Number(family.stats.totalSales).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Units Sold</p>
                <p className="text-lg font-semibold">{Number(family.stats.totalQuantity).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href={`/product-families/${family.id}?timeframe=${timeFrame}${startDateParam ? `&start=${startDateParam}` : ''}${endDateParam ? `&end=${endDateParam}` : ''}`} 
                className="text-blue-500 hover:text-blue-700 hover:underline"
              >
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}