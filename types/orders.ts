import { Order, Customer, CustomerEmail } from "@prisma/client"

export type OrderWithCustomer = Order & {
  customer: Pick<Customer, "customerName"> & {
    emails: Pick<CustomerEmail, "email">[]
  }
}

export type TableOrder = {
  id: string
  orderNumber: string
  orderDate: Date
  customerName: string
  status: Order['status']
  paymentStatus: Order['paymentStatus']
  totalAmount: number
  dueDate: Date | null
  paymentMethod: string | null
  quickbooksId: string | null
}

export interface TableData {
  orders: TableOrder[]
  totalCount: number
  recentCount: number
}

export interface Column {
  key: keyof TableOrder
  label: string
  render?: (value: unknown, order: TableOrder) => React.ReactNode
}

export interface FetchParams {
  page: number
  searchTerm: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  [key: string]: unknown
}
