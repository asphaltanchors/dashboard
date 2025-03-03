"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ProductLineReferenceProps {
  data: Array<{
    product_line: string
    products: Array<{
      productCode: string
      name: string | null
      description: string | null
      total_sales?: string
    }>
  }>
}

export function ProductLineReference({ data }: ProductLineReferenceProps) {
  // Flatten the data structure to create table rows, filter out products with $0 sales, and sort by product name
  const tableRows = data.flatMap(line => 
    line.products
      .filter(product => product.total_sales && parseFloat(product.total_sales) > 0)
      .map(product => ({
        product_line: line.product_line,
        ...product
      }))
  ).sort((a, b) => {
    // Sort by product name (case-insensitive)
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Product Line Reference</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Line</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{row.product_line}</TableCell>
                <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">{row.name || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
                  {row.description || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {row.total_sales ? 
                    `$${parseFloat(row.total_sales).toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}` : 
                    '$0.00'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
