-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "products" (
	"item_name" text,
	"sales_description" text
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"quickbooks_id" text,
	"customer_name" text,
	"first_name" text,
	"last_name" text,
	"customer_type" text,
	"company_id" text
);
--> statement-breakpoint
CREATE TABLE "item_history" (
	"item_name" text,
	"column_name" text,
	"old_value" text,
	"new_value" text,
	"changed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"order_id" text,
	"order_number" text,
	"order_type" text,
	"product_code" text,
	"product_description" text,
	"quantity" numeric,
	"unit_price" numeric,
	"line_amount" numeric,
	"product_class" text,
	"service_date" text,
	"sales_tax_code" text
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"company_id" text,
	"company_name" text,
	"customer_name" text,
	"company_domain" text,
	"created_at" date
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"quickbooks_id" text,
	"order_number" text,
	"order_type" text,
	"class" text,
	"terms" text,
	"status" text,
	"po_number" text,
	"payment_method" text,
	"order_date" date,
	"total_amount" numeric,
	"customer_name" text,
	"billing_address_line_1" text,
	"billing_address_line_2" text,
	"shipping_address_line_1" text,
	"shipping_address_line_2" text
);
--> statement-breakpoint
CREATE VIEW "public"."item_history_view" AS (SELECT h.item_name, p.sales_description, h.column_name, h.old_value, h.new_value, h.changed_at, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text, 'quantity_on_hand'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL THEN h.new_value::numeric - h.old_value::numeric ELSE NULL::numeric END AS numeric_change, CASE WHEN (h.column_name = ANY (ARRAY['purchase_cost'::text, 'sales_price'::text])) AND h.old_value IS NOT NULL AND h.new_value IS NOT NULL AND h.old_value::numeric <> 0::numeric THEN round((h.new_value::numeric - h.old_value::numeric) / h.old_value::numeric * 100::numeric, 2) ELSE NULL::numeric END AS percent_change FROM item_history h LEFT JOIN products p ON h.item_name = p.item_name ORDER BY h.changed_at DESC, h.item_name, h.column_name);--> statement-breakpoint
CREATE VIEW "public"."company_stats" AS (SELECT c.company_id, count(DISTINCT cust.quickbooks_id) AS customer_count, 0 AS total_orders FROM companies c LEFT JOIN customers cust ON cust.company_id = c.company_id GROUP BY c.company_id);
*/