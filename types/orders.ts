import { Order, Customer, CustomerEmail } from "@prisma/client"

export type OrderWithCustomer = Order & {
  customer: Pick<Customer, "customerName"> & {
    emails: Pick<CustomerEmail, "email">[]
  }
}

export type Address = {
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string | null
  country: string | null
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
  shippingAddress: Address | null
}

export interface TableData {
  orders: TableOrder[]
  totalCount: number
  recentCount: number
  accountsReceivable: number
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
