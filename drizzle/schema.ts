import { pgTable, text, timestamp, numeric, date, pgView, bigint, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const products = pgTable("products", {
	itemName: text("item_name"),
	salesDescription: text("sales_description"),
});

export const customers = pgTable("customers", {
	quickbooksId: text("quickbooks_id"),
	customerName: text("customer_name"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	customerType: text("customer_type"),
	companyId: text("company_id"),
});

export const itemHistory = pgTable("item_history", {
	itemName: text("item_name"),
	columnName: text("column_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedAt: timestamp("changed_at", { mode: 'string' }),
});

export const orderItems = pgTable("order_items", {
	orderId: text("order_id"),
	orderNumber: text("order_number"),
	orderType: text("order_type"),
	productCode: text("product_code"),
	productDescription: text("product_description"),
	quantity: numeric(),
	unitPrice: numeric("unit_price"),
	lineAmount: numeric("line_amount"),
	productClass: text("product_class"),
	serviceDate: text("service_date"),
	salesTaxCode: text("sales_tax_code"),
});

export const companies = pgTable("companies", {
	companyId: text("company_id"),
	companyName: text("company_name"),
	customerName: text("customer_name"),
	companyDomain: text("company_domain"),
	createdAt: date("created_at"),
});

export const orders = pgTable("orders", {
	quickbooksId: text("quickbooks_id"),
	orderNumber: text("order_number"),
	orderType: text("order_type"),
	class: text(),
	terms: text(),
	status: text(),
	poNumber: text("po_number"),
	paymentMethod: text("payment_method"),
	orderDate: date("order_date"),
	totalAmount: numeric("total_amount"),
	customerName: text("customer_name"),
	billingAddressLine1: text("billing_address_line_1"),
	billingAddressLine2: text("billing_address_line_2"),
	shippingAddressLine1: text("shipping_address_line_1"),
	shippingAddressLine2: text("shipping_address_line_2"),
});
export const itemHistoryView = pgView("item_history_view", {	itemName: text("item_name"),
	salesDescription: text("sales_description"),
	columnName: text("column_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedAt: timestamp("changed_at", { mode: 'string' }),
	numericChange: numeric("numeric_change"),
	percentChange: numeric("percent_change"),
}).as(sql`SELECT h.item_name, p.sales_description, h.column_name, h.old_value, h.new_value, h.changed_at, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text, 'quantity_on_hand'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL THEN h.new_value::numeric - h.old_value::numeric ELSE NULL::numeric END AS numeric_change, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL AND h.old_value::numeric <> 0::numeric THEN round((h.new_value::numeric - h.old_value::numeric) / h.old_value::numeric * 100::numeric, 2) ELSE NULL::numeric END AS percent_change FROM item_history h LEFT JOIN products p ON h.item_name = p.item_name ORDER BY h.changed_at DESC, h.item_name, h.column_name`);

export const companyStats = pgView("company_stats", {	companyId: text("company_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerCount: bigint("customer_count", { mode: "number" }),
	totalOrders: integer("total_orders"),
}).as(sql`SELECT c.company_id, count(DISTINCT cust.quickbooks_id) AS customer_count, 0 AS total_orders FROM companies c LEFT JOIN customers cust ON cust.company_id = c.company_id GROUP BY c.company_id`);