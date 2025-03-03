"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

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
  const [expandedLines, setExpandedLines] = useState<string[]>([])

  const toggleLine = (line: string) => {
    setExpandedLines(prev => 
      prev.includes(line) 
        ? prev.filter(l => l !== line)
        : [...prev, line]
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Product Line Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map(line => (
          <div key={line.product_line} className="border rounded-lg">
            <button
              onClick={() => toggleLine(line.product_line)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {expandedLines.includes(line.product_line) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">{line.product_line}</span>
                <span className="text-muted-foreground text-sm">
                  ({line.products.length} product{line.products.length !== 1 ? 's' : ''})
                </span>
              </div>
            </button>
            
            {expandedLines.includes(line.product_line) && (
              <div className="px-10 pb-3 space-y-2">
                {line.products.map((product, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{product.productCode}</span>
                    {product.name && (
                      <>: {product.name}</>
                    )}
                    {product.total_sales && (
                      <span className="ml-2 text-muted-foreground">
                        ${parseFloat(product.total_sales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                    {product.description && (
                      <div className="text-muted-foreground ml-4 text-xs">
                        {product.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
