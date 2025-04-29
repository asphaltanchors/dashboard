# CSV Export Feature Documentation

## Overview

The CSV export feature allows users to download customer data in a compact, URL-friendly format. This document explains the encoding scheme used for company classes and product purchases, as well as the overall structure of the exported CSV files.

## CSV Structure

Each exported CSV file contains three columns:

1. **email**: The customer's email address
2. **name**: The customer's display name (first and last name, or customer name if those aren't available)
3. **extras**: A JSON string containing encoded information about company class and product purchases

Example CSV row:
```
"john@example.com","John Doe","{\"c\":\"d\",\"a\":true,\"b\":true,\"s\":true}"
```

## Encoding Scheme

### Company Class Encoding

Company classes are encoded as a single letter in the `c` field of the extras JSON:

| Code | Company Class |
|------|---------------|
| a | AAG -- do not use |
| b | Amazon Combined:Amazon Direct |
| c | Contractor |
| d | Distributor |
| e | EXPORT |
| f | EXPORT from WWD |
| g | OEM |
| h | Unknown |
| i | consumer |
| j | eStore |

### Product Family Encoding

Product families are encoded as boolean flags in the extras JSON:

| Field | Product Family | Description |
|-------|---------------|-------------|
| a | AM625 | Plastic asphalt anchors for lighter applications |
| b | SP10 | 6-inch asphalt anchors with various thread sizes and coatings |
| s | SP12 | 8-inch asphalt anchors with various thread sizes and coatings |
| d | SP18 | 10-inch asphalt anchors with various thread sizes and coatings |
| e | SP58 | Heavy-duty 10-inch asphalt anchors with 5/8" or M16 thread |

Note: We use `s` for SP12 instead of `c` to avoid a naming conflict with the company class code.

## Examples

### Example 1: Distributor who purchased AM625 and SP10

```json
{"c":"d","a":true,"b":true}
```

This represents a customer from a Distributor company who has purchased products from the AM625 and SP10 families.

### Example 2: OEM who purchased SP12, SP18, and SP58

```json
{"c":"g","s":true,"d":true,"e":true}
```

This represents a customer from an OEM company who has purchased products from the SP12, SP18, and SP58 families.

### Example 3: Consumer with no product purchases

```json
{"c":"i"}
```

This represents a customer from a consumer company who hasn't purchased any products from the tracked product families.

## Implementation Details

The encoding is implemented in the following files:

- `app/people/company-class/[companyClass]/page.tsx`: Contains the main implementation of the encoding scheme and CSV export for the company class page
- `components/export-csv-button.tsx`: Contains the generic CSV export button component that handles the actual CSV generation

The encoding is done at the company level, not the individual customer level. This means that if any customer from a company has purchased a product from a specific family, all customers from that company will show that product family as purchased.

## URL Usage

The compact encoding is designed to be used in URLs. For example, you could create a URL like:

```
https://example.com/filter?company=d&products=a,b
```

This would filter for customers from Distributor companies who have purchased AM625 and SP10 products.
