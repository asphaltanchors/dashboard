# Company/Customer Display Cleanup

## Context

The system has companies and customers with these key characteristics:

1. Companies are derived from customer email domains
2. Most companies are single-entity businesses with specific pricing agreements
   - Example: "A-Safe, Inc. 40% anchors 35%grout"
   - Example: "Norfast, Inc. 50 Anc 40 epx 35 tub"
3. Few companies (like Fastenal) have multiple locations/branches
4. Pricing information is encoded in customer names
5. Companies often have multiple contacts with different roles (billing, sales)

## Implementation Plan

### 1. Company View (/companies/[id]/page.tsx)

#### A. Create New Components

1. `components/companies/pricing-display.tsx`:
```typescript
interface PricingDisplayProps {
  customers: Array<{
    customerName: string;
    orders: Array<{
      totalAmount: number;
      // Add other relevant order fields
    }>;
  }>;
}

// Extract pricing info from names like "40% anchors 35%grout"
function parsePricingInfo(customerName: string) {
  const patterns = [
    /(\d+)%\s*(?:anchors?|anc)/i,
    /(\d+)%\s*(?:grout|epoxy|epx)/i,
    /(\d+)%\s*(?:tub)/i
  ];
  
  return patterns.reduce((acc, pattern) => {
    const match = customerName.match(pattern);
    if (match) {
      const [, percentage] = match;
      const type = pattern.source.includes('anc') ? 'Anchors' :
                   pattern.source.includes('grout|epoxy') ? 'Grout/Epoxy' :
                   'Tub';
      acc[type] = `${percentage}%`;
    }
    return acc;
  }, {} as Record<string, string>);
}
```

2. `components/companies/order-metrics.tsx`:
```typescript
interface OrderMetricsProps {
  orders: Array<{
    orderDate: Date;
    totalAmount: number;
    items: Array<{
      productCode: string;
      quantity: number;
      amount: number;
    }>;
  }>;
}

// Add charts for:
// - Order frequency (orders per month)
// - Product category breakdown
// - Order value trends
```

3. `components/companies/contact-list.tsx`:
```typescript
interface ContactListProps {
  contacts: Array<{
    email: string;
    phone?: string;
    isPrimary: boolean;
  }>;
}

// Group contacts by email domain
// Identify roles from email prefixes (accounting@, sales@, etc.)
// Add copy/email quick actions
```

#### B. Update Company Page Layout

1. Replace current company card with:
```tsx
<div className="space-y-6">
  {/* Company Overview */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        {company.name}
        {company.enriched && <EnrichmentBadge />}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Basic company info */}
        {/* Enrichment status if applicable */}
      </div>
    </CardContent>
  </Card>

  {/* Pricing Display */}
  <PricingDisplay customers={company.customers} />

  {/* Order Metrics */}
  <OrderMetrics orders={allOrders} />

  {/* Contact List */}
  <ContactList contacts={allContacts} />

  {/* Customer List - Only if multiple customers */}
  {company.customers.length > 1 && (
    <CustomersTable customers={company.customers} />
  )}
</div>
```

### 2. Customer View (/customers/[id]/page.tsx)

#### A. Simplify Customer Page

1. Remove duplicate company information
2. Focus on individual details:
```tsx
<div className="space-y-6">
  {/* Customer Overview */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        {customer.customerName}
        <Link href={`/companies/${customer.company.id}`}>
          View Company
        </Link>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Contact info */}
      {/* Pricing terms */}
      {/* Status */}
    </CardContent>
  </Card>

  {/* Order History with Applied Pricing */}
  <OrderHistory orders={customer.orders} pricing={parsePricingInfo(customer.customerName)} />
</div>
```

### 3. Implementation Order

1. Create utility functions:
   - Pricing parser
   - Contact grouping
   - Order analytics calculations

2. Build new components:
   - PricingDisplay
   - OrderMetrics
   - ContactList

3. Update company page:
   - Implement new layout
   - Add new components
   - Test with various company types

4. Update customer page:
   - Simplify layout
   - Add pricing display
   - Enhance order history

5. Add navigation improvements:
   - Clear breadcrumbs
   - Company/customer relationships
   - Quick filters

## Testing Scenarios

1. Test with different company types:
   - Single customer companies
   - Multi-location (Fastenal)
   - Various pricing patterns

2. Verify pricing extraction:
   ```typescript
   const testCases = [
     "A-Safe, Inc. 40% anchors 35%grout",
     "Norfast, Inc. 50 Anc 40 epx 35 tub",
     "Fasteners Plus (40%) 35%grout/epoxy"
   ];
   ```

3. Check contact grouping:
   - Multiple contacts same domain
   - Different role patterns
   - Primary vs secondary contacts

4. Validate order analytics:
   - Different time periods
   - Product mix analysis
   - Value trends

## Notes

- Keep existing schema - no database changes
- Maintain existing data import system
- Focus on UI improvements and better data organization
- Use existing enrichment system where applicable
