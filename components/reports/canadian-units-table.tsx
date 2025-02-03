import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface ProductSales {
  productCode: string
  productName: string
  description: string
  totalUnits: number
  totalRevenue: number
}

export function CanadianUnitsTable({
  products
}: {
  products: ProductSales[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Units Sold</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.productCode}>
            <TableCell>{product.productCode}</TableCell>
            <TableCell>{product.description}</TableCell>
            <TableCell className="text-right">{product.totalUnits}</TableCell>
            <TableCell className="text-right">{formatCurrency(product.totalRevenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
