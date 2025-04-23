import { pgTable, pgSchema, text, boolean, date, numeric, bigint, integer, primaryKey, varchar, doublePrecision, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const analytics = pgSchema("analytics");


export const companiesInAnalytics = analytics.table("companies", {
	companyId: text("company_id"),
	companyName: text("company_name"),
	customerName: text("customer_name"),
	companyDomain: text("company_domain"),
	isConsumerDomain: boolean("is_consumer_domain"),
	createdAt: date("created_at"),
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

export const itemHistoryInAnalytics = analytics.table("item_history", {
	itemName: text("item_name"),
	columnName: text("column_name"),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedAt: date("changed_at"),
});

export const customersInAnalytics = analytics.table("customers", {
	quickbooksId: text("quickbooks_id"),
	customerName: text("customer_name"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	customerType: text("customer_type"),
	billingCity: text("billing_city"),
	billingState: text("billing_state"),
	billingZip: text("billing_zip"),
	shippingCity: text("shipping_city"),
	shippingState: text("shipping_state"),
	shippingZip: text("shipping_zip"),
	email: text(),
	companyId: text("company_id"),
});

export const productsInAnalytics = analytics.table("products", {
	itemName: text("item_name"),
	salesDescription: text("sales_description"),
	productFamily: text("product_family"),
	materialType: text("material_type"),
	isKit: boolean("is_kit"),
	itemQuantity: integer("item_quantity"),
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
