import { pgTable, pgSchema, text, date, boolean, integer, bigint, numeric, primaryKey, varchar, doublePrecision, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const analytics = pgSchema("analytics");


export const itemHistoryInAnalytics = analytics.table("item_history", {
	itemName: text("item_name"),
	columnName: text("column_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedAt: date("changed_at"),
});

export const productsInAnalytics = analytics.table("products", {
	itemName: text("item_name"),
	salesDescription: text("sales_description"),
	productFamily: text("product_family"),
	materialType: text("material_type"),
	isKit: boolean("is_kit"),
	itemQuantity: integer("item_quantity"),
});

export const customerEmailsInAnalytics = analytics.table("customer_emails", {
	quickbooksId: text("quickbooks_id"),
	customerName: text("customer_name"),
	companyName: text("company_name"),
	emailAddress: text("email_address"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	emailRank: bigint("email_rank", { mode: "number" }),
	emailDomain: text("email_domain"),
	isPrimaryEmail: boolean("is_primary_email"),
});

export const companiesInAnalytics = analytics.table("companies", {
	companyId: text("company_id"),
	companyName: text("company_name"),
	customerName: text("customer_name"),
	companyDomain: text("company_domain"),
	isConsumerDomain: boolean("is_consumer_domain"),
	class: text(),
	createdAt: date("created_at"),
});

export const orderItemsInAnalytics = analytics.table("order_items", {
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

export const ordersInAnalytics = analytics.table("orders", {
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
	billingAddressLine3: text("billing_address_line_3"),
	billingAddressCity: text("billing_address_city"),
	billingAddressState: text("billing_address_state"),
	billingAddressPostalCode: text("billing_address_postal_code"),
	billingAddressCountry: text("billing_address_country"),
	shippingAddressLine1: text("shipping_address_line_1"),
	shippingAddressLine2: text("shipping_address_line_2"),
	shippingAddressLine3: text("shipping_address_line_3"),
	shippingAddressCity: text("shipping_address_city"),
	shippingAddressState: text("shipping_address_state"),
	shippingAddressPostalCode: text("shipping_address_postal_code"),
	shippingAddressCountry: text("shipping_address_country"),
	industry: text(),
	sourcechannel: text(),
});

export const customersInAnalytics = analytics.table("customers", {
	quickbooksId: text("quickbooks_id"),
	customerName: text("customer_name"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	billingCity: text("billing_city"),
	billingState: text("billing_state"),
	billingZip: text("billing_zip"),
	shippingCity: text("shipping_city"),
	shippingState: text("shipping_state"),
	shippingZip: text("shipping_zip"),
	email: text(),
	companyId: text("company_id"),
});

export const companyOrderMappingInAnalytics = analytics.table("company_order_mapping", {
	quickbooksId: varchar("quickbooks_id", { length: 255 }).notNull(),
	companyId: varchar("company_id", { length: 255 }).notNull(),
	orderNumber: varchar("order_number", { length: 255 }),
	matchType: varchar("match_type", { length: 50 }),
	confidence: doublePrecision(),
	originalCustomerName: text("original_customer_name"),
	originalCompanyName: text("original_company_name"),
	normalizedCustomerName: text("normalized_customer_name"),
	normalizedCompanyName: text("normalized_company_name"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	primaryKey({ columns: [table.quickbooksId, table.companyId], name: "company_order_mapping_pkey"}),
]);
export const companyStatsInAnalytics = analytics.view("company_stats", {	companyId: text("company_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerCount: bigint("customer_count", { mode: "number" }),
	totalOrders: integer("total_orders"),
}).as(sql`SELECT c.company_id, count(DISTINCT cust.quickbooks_id) AS customer_count, 0 AS total_orders FROM analytics.companies c LEFT JOIN analytics.customers cust ON cust.company_id = c.company_id GROUP BY c.company_id`);

export const itemHistoryViewInAnalytics = analytics.view("item_history_view", {	itemName: text("item_name"),
	salesDescription: text("sales_description"),
	columnName: text("column_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedAt: date("changed_at"),
	numericChange: numeric("numeric_change"),
	percentChange: numeric("percent_change"),
}).as(sql`SELECT h.item_name, p.sales_description, h.column_name, h.old_value, h.new_value, h.changed_at, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text, 'quantity_on_hand'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL THEN h.new_value::numeric - h.old_value::numeric ELSE NULL::numeric END AS numeric_change, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL AND h.old_value::numeric <> 0::numeric THEN round((h.new_value::numeric - h.old_value::numeric) / h.old_value::numeric * 100::numeric, 2) ELSE NULL::numeric END AS percent_change FROM analytics.item_history h LEFT JOIN analytics.products p ON h.item_name = p.item_name ORDER BY h.changed_at DESC, h.item_name, h.column_name`);

export const orderCompanyViewInAnalytics = analytics.view("order_company_view", {	quickbooksId: text("quickbooks_id"),
	orderNumber: text("order_number"),
	customerName: text("customer_name"),
	orderDate: date("order_date"),
	totalAmount: numeric("total_amount"),
	billingAddressLine1: text("billing_address_line_1"),
	shippingAddressLine1: text("shipping_address_line_1"),
	companyId: text("company_id"),
	companyName: text("company_name"),
	companyDomain: text("company_domain"),
	matchType: varchar("match_type", { length: 50 }),
	confidence: doublePrecision(),
}).as(sql`SELECT o.quickbooks_id, o.order_number, o.customer_name, o.order_date, o.total_amount, o.billing_address_line_1, o.shipping_address_line_1, c.company_id, c.company_name, c.company_domain, m.match_type, m.confidence FROM analytics.orders o JOIN analytics.company_order_mapping m ON o.quickbooks_id = m.quickbooks_id::text JOIN analytics.companies c ON m.company_id::text = c.company_id ORDER BY o.order_date DESC`);