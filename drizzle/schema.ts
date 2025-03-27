import { pgTable, text, numeric, date, boolean, integer, timestamp, primaryKey, varchar, doublePrecision, pgView, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



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

export const products = pgTable("products", {
	itemName: text("item_name"),
	salesDescription: text("sales_description"),
	productFamily: text("product_family"),
	materialType: text("material_type"),
	isKit: boolean("is_kit"),
	itemQuantity: integer("item_quantity"),
});

export const itemHistory = pgTable("item_history", {
	itemName: text("item_name"),
	columnName: text("column_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedAt: timestamp("changed_at", { mode: 'string' }),
});

export const customers = pgTable("customers", {
	quickbooksId: text("quickbooks_id"),
	customerName: text("customer_name"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	customerType: text("customer_type"),
	companyId: text("company_id"),
});

export const companyOrderMapping = pgTable("company_order_mapping", {
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
export const orderCompanyView = pgView("order_company_view", {	quickbooksId: text("quickbooks_id"),
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
}).as(sql`SELECT o.quickbooks_id, o.order_number, o.customer_name, o.order_date, o.total_amount, o.billing_address_line_1, o.shipping_address_line_1, c.company_id, c.company_name, c.company_domain, m.match_type, m.confidence FROM orders o JOIN company_order_mapping m ON o.quickbooks_id = m.quickbooks_id::text JOIN companies c ON m.company_id::text = c.company_id ORDER BY o.order_date DESC`);

export const itemHistoryView = pgView("item_history_view", {	itemName: text("item_name"),
	salesDescription: text("sales_description"),
	columnName: text("column_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedAt: timestamp("changed_at", { mode: 'string' }),
	numericChange: numeric("numeric_change"),
	percentChange: numeric("percent_change"),
}).as(sql`SELECT h.item_name, p.sales_description, h.column_name, h.old_value, h.new_value, h.changed_at, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text, 'quantity_on_hand'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL THEN h.new_value::numeric - h.old_value::numeric ELSE NULL::numeric END AS numeric_change, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL AND h.old_value::numeric <> 0::numeric THEN round((h.new_value::numeric - h.old_value::numeric) / h.old_value::numeric * 100::numeric, 2) ELSE NULL::numeric END AS percent_change FROM item_history h LEFT JOIN products p ON h.item_name = p.item_name ORDER BY h.changed_at DESC, h.item_name, h.column_name`);

export const companies = pgView("companies", {	companyId: text("company_id"),
	companyName: text("company_name"),
	customerName: text("customer_name"),
	companyDomain: text("company_domain"),
	isConsumerDomain: boolean("is_consumer_domain"),
	createdAt: date("created_at"),
}).as(sql`WITH email_domains AS ( SELECT customers."QuickBooks Internal Id" AS quickbooks_id, customers."Company Name" AS company_name, customers."Customer Name" AS customer_name, customers."Main Email" AS email_raw, regexp_split_to_table(customers."Main Email", ''::text) AS email_address FROM raw.customers WHERE customers."Main Email" IS NOT NULL ), extracted_domains AS ( SELECT email_domains.quickbooks_id, email_domains.company_name, email_domains.customer_name, email_domains.email_raw, CASE WHEN POSITION(('@'::text) IN (email_domains.email_address)) > 0 THEN lower(TRIM(BOTH FROM SUBSTRING(email_domains.email_address FROM POSITION(('@'::text) IN (email_domains.email_address)) + 1))) ELSE NULL::text END AS domain FROM email_domains WHERE POSITION(('@'::text) IN (email_domains.email_address)) > 0 ), domain_counts AS ( SELECT extracted_domains.quickbooks_id, extracted_domains.company_name, extracted_domains.customer_name, extracted_domains.domain, count(*) AS domain_count FROM extracted_domains WHERE extracted_domains.domain IS NOT NULL GROUP BY extracted_domains.quickbooks_id, extracted_domains.company_name, extracted_domains.customer_name, extracted_domains.domain ), ranked_domains AS ( SELECT domain_counts.quickbooks_id, domain_counts.company_name, domain_counts.customer_name, domain_counts.domain, domain_counts.domain_count, row_number() OVER (PARTITION BY domain_counts.quickbooks_id ORDER BY domain_counts.domain_count DESC, domain_counts.domain) AS domain_rank FROM domain_counts ), customer_domains AS ( SELECT c."QuickBooks Internal Id" AS quickbooks_id, c."Company Name" AS company_name, c."Customer Name" AS customer_name, COALESCE(rd.domain, CASE WHEN c."Main Email" IS NOT NULL AND POSITION(('@'::text) IN (c."Main Email")) > 0 THEN lower(SUBSTRING(c."Main Email" FROM POSITION(('@'::text) IN (c."Main Email")) + 1)) ELSE NULL::text END) AS company_domain, CASE WHEN c."Created Date" IS NOT NULL AND c."Created Date" <> ''::text THEN to_date(c."Created Date", 'MM-DD-YYYY'::text) ELSE NULL::date END AS created_date FROM raw.customers c LEFT JOIN ranked_domains rd ON c."QuickBooks Internal Id" = rd.quickbooks_id AND rd.domain_rank = 1 WHERE rd.domain IS NOT NULL OR c."Main Email" IS NOT NULL AND POSITION(('@'::text) IN (c."Main Email")) > 0 ), unique_domains AS ( SELECT DISTINCT customer_domains.company_domain, first_value(customer_domains.company_name) OVER (PARTITION BY customer_domains.company_domain ORDER BY ( CASE WHEN customer_domains.company_name IS NOT NULL AND TRIM(BOTH FROM customer_domains.company_name) <> ''::text THEN 0 ELSE 1 END), customer_domains.company_name) AS company_name, first_value(customer_domains.customer_name) OVER (PARTITION BY customer_domains.company_domain ORDER BY ( CASE WHEN customer_domains.customer_name IS NOT NULL AND TRIM(BOTH FROM customer_domains.customer_name) <> ''::text THEN 0 ELSE 1 END), customer_domains.customer_name) AS customer_name, min(customer_domains.created_date) OVER (PARTITION BY customer_domains.company_domain) AS earliest_created_date FROM customer_domains WHERE customer_domains.company_domain IS NOT NULL ), consumer_domains AS ( SELECT unnest(ARRAY['gmail.com'::text, 'yahoo.com'::text, 'yahoo.com.mx'::text, 'yahoo.com.brhotmail.com'::text, 'outlook.com'::text, 'aol.com'::text, 'icloud.com'::text, 'protonmail.com'::text, 'marketplace.amazon.com'::text, 'comcast.net'::text, 'verizon.net'::text, 'msn.com'::text, 'me.com'::text, 'att.net'::text, 'live.com'::text, 'bellsouth.net'::text, 'sbcglobal.net'::text, 'cox.net'::text, 'mac.com'::text, 'mail.com'::text, 'unknown-domain.com'::text, 'amazon-fba.com'::text, 'amazon.com'::text, 'zoho.com'::text, 'yandex.com'::text, 'gmx.com'::text]) AS domain ) SELECT md5(unique_domains.company_domain) AS company_id, unique_domains.company_name, unique_domains.customer_name, unique_domains.company_domain, (EXISTS ( SELECT 1 FROM consumer_domains WHERE consumer_domains.domain = unique_domains.company_domain)) AS is_consumer_domain, COALESCE(unique_domains.earliest_created_date, CURRENT_DATE) AS created_at FROM unique_domains;`);

export const companyStats = pgView("company_stats", {	companyId: text("company_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerCount: bigint("customer_count", { mode: "number" }),
	totalOrders: integer("total_orders"),
}).as(sql`SELECT c.company_id, count(DISTINCT cust.quickbooks_id) AS customer_count, 0 AS total_orders FROM companies c LEFT JOIN customers cust ON cust.company_id = c.company_id GROUP BY c.company_id`);