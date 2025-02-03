import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface CanadianCustomer {
  id: string
  customerName: string
  companyName: string | null
  companyDomain: string | null
  orderCount: number
  totalRevenue: number
  totalUnits: number
}

export function CanadianSalesTable({
  customers
}: {
  customers: CanadianCustomer[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Company</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell>{customer.customerName}</TableCell>
            <TableCell>{customer.companyName || customer.companyDomain || '-'}</TableCell>
            <TableCell className="text-right">{customer.orderCount}</TableCell>
            <TableCell className="text-right">{customer.totalUnits}</TableCell>
            <TableCell className="text-right">{formatCurrency(customer.totalRevenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
