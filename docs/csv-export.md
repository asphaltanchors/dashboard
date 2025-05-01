# CSV Export Feature Documentation

## Overview

The CSV export feature allows users to download customer data in a format that includes individual encoding fields and full text fields. This document explains the encoding scheme used for company classes and product purchases, as well as the overall structure of the exported CSV files.

## CSV Structure

Each exported CSV file contains three columns:

1. **email**: The customer's email address
2. **name**: The customer's display name (first and last name, or customer name if those aren't available)
3. **attributes**: A JSON string containing individual encoding fields and full text fields for company class and product purchases

Example CSV row:
```
"john@example.com","John Doe","{""class"":""Distributor"",""c"":""d"",""a"":1,""b"":1,""s"":1,""d"":0,""e"":0,""AM625"":true,""SP10"":true,""SP12"":true,""SP18"":false,""SP58"":false}"
```

Note: The JSON in the attributes column is double-escaped (quotes are represented as `""` instead of `\"`) to conform with CSV standards.

## Encoding Scheme

The export format includes both individual encoding fields and full text fields. The encoding fields use the scheme described below, while the full text fields use the actual company class name and product family names.

### Company Class Encoding

Company classes are encoded as a single letter in the `c` parameter of the minimized URL-encoded string:

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

Product families are encoded as numeric flags (1 for true, 0 for false) in the individual encoding fields:

| Parameter | Product Family | Description |
|-----------|---------------|-------------|
| a | AM625 | Plastic asphalt anchors for lighter applications |
| b | SP10 | 6-inch asphalt anchors with various thread sizes and coatings |
| s | SP12 | 8-inch asphalt anchors with various thread sizes and coatings |
| d | SP18 | 10-inch asphalt anchors with various thread sizes and coatings |
| e | SP58 | Heavy-duty 10-inch asphalt anchors with 5/8" or M16 thread |

Note: We use `s` for SP12 instead of `c` to avoid a naming conflict with the company class code.

## Examples

### Example 1: Distributor who purchased AM625 and SP10

In the JSON:
```json
{
  "class": "Distributor",
  "c": "d",
  "a": 1,
  "b": 1,
  "s": 0,
  "d": 0,
  "e": 0,
  "AM625": true,
  "SP10": true,
  "SP12": false,
  "SP18": false,
  "SP58": false
}
```

In the CSV:
```
"john@example.com","John Doe","{""class"":""Distributor"",""c"":""d"",""a"":1,""b"":1,""s"":0,""d"":0,""e"":0,""AM625"":true,""SP10"":true,""SP12"":false,""SP18"":false,""SP58"":false}"
```

This represents a customer from a Distributor company who has purchased products from the AM625 and SP10 families.

### Example 2: OEM who purchased SP12, SP18, and SP58

In the JSON:
```json
{
  "class": "OEM",
  "c": "g",
  "a": 0,
  "b": 0,
  "s": 1,
  "d": 1,
  "e": 1,
  "AM625": false,
  "SP10": false,
  "SP12": true,
  "SP18": true,
  "SP58": true
}
```

In the CSV:
```
"jane@example.com","Jane Smith","{""class"":""OEM"",""c"":""g"",""a"":0,""b"":0,""s"":1,""d"":1,""e"":1,""AM625"":false,""SP10"":false,""SP12"":true,""SP18"":true,""SP58"":true}"
```

This represents a customer from an OEM company who has purchased products from the SP12, SP18, and SP58 families.

### Example 3: Consumer with no product purchases

In the JSON:
```json
{
  "class": "consumer",
  "c": "i",
  "a": 0,
  "b": 0,
  "s": 0,
  "d": 0,
  "e": 0,
  "AM625": false,
  "SP10": false,
  "SP12": false,
  "SP18": false,
  "SP58": false
}
```

In the CSV:
```
"bob@example.com","Bob Johnson","{""class"":""consumer"",""c"":""i"",""a"":0,""b"":0,""s"":0,""d"":0,""e"":0,""AM625"":false,""SP10"":false,""SP12"":false,""SP18"":false,""SP58"":false}"
```

This represents a customer from a consumer company who hasn't purchased any products from the tracked product families.

## Implementation Details

The encoding is implemented in the following files:

- `app/people/company-class/[companyClass]/page.tsx`: Contains the main implementation of the encoding scheme and CSV export for the company class page
- `components/export-csv-button.tsx`: Contains the generic CSV export button component that handles the actual CSV generation

The encoding is done at the company level, not the individual customer level. This means that if any customer from a company has purchased a product from a specific family, all customers from that company will show that product family as purchased.

The export format includes both individual encoding fields and full text fields, making it more versatile for different use cases:
- The encoding fields are compact and can be used for filtering or processing
- The full text fields are more readable and self-documenting, making the data easier to work with directly

## URL Usage

The individual encoding fields can be used to construct URLs for filtering. For example, you could create a URL like:

```
https://example.com/filter?c=d&a=1&b=1
```

This would filter for customers from Distributor companies who have purchased AM625 and SP10 products.

Alternatively, you could use the full text fields for more readable URLs:

```
https://example.com/filter?class=Distributor&products=AM625,SP10
```

The format supports both approaches, giving you flexibility in how you use the data.
