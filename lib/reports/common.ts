import { Prisma } from "@prisma/client"
import { CONSUMER_DOMAINS } from "@/lib/companies"

export interface FilterParams {
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}

export interface ProductLineMetric {
  product_line: string
  order_count: string
  total_units: string
  total_revenue: string
}

export interface ProductDetail {
  productCode: string
  name: string
  description: string | null
}

// Canadian address detection patterns
export const CANADIAN_PROVINCES = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU']

export const ADHESIVE_PRODUCT_CODES = [
  // EPX2 products
  '82-5002.K',
  '82-5002.010',
  // EPX3 products
  '82-6002'
]

// Helper function to build additional WHERE clauses for filters
export function buildFilterClauses(filters?: FilterParams): { 
  additionalFilters: string, 
  filterClauses: string[] 
} {
  const filterClauses: string[] = []
  if (filters?.minAmount) {
    filterClauses.push(`o."totalAmount" >= ${filters.minAmount}`)
  }
  if (filters?.maxAmount) {
    filterClauses.push(`o."totalAmount" <= ${filters.maxAmount}`)
  }
  if (filters?.filterConsumer) {
    filterClauses.push(`
      NOT EXISTS (
        SELECT 1 FROM "Customer" c
        JOIN "Company" comp ON c."companyDomain" = comp."domain"
        WHERE c."id" = o."customerId"
        AND comp."domain" = ANY(ARRAY[${CONSUMER_DOMAINS.map(d => `'${d}'`).join(',')}])
      )
    `)
  }

  const additionalFilters = filterClauses.length > 0 
    ? 'AND ' + filterClauses.join(' AND ')
    : ''

  return { additionalFilters, filterClauses }
}

// Helper function to calculate date ranges
export function calculateDateRange(dateRange?: string): { 
  startDate: Date, 
  currentPeriodStart?: Date, 
  previousPeriodStart?: Date 
} {
  const today = new Date()
  const days = dateRange ? parseInt(dateRange.replace("d", "")) : 365
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)
  
  return { startDate }
}

// Helper function to calculate current and previous periods
export function calculatePeriods(dateRange?: string): { 
  currentPeriodStart: Date, 
  previousPeriodStart: Date 
} {
  const today = new Date()
  const days = dateRange ? parseInt(dateRange.replace("d", "")) : 365
  const currentPeriodStart = new Date(today)
  currentPeriodStart.setDate(today.getDate() - days)
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setDate(currentPeriodStart.getDate() - days)
  
  return { currentPeriodStart, previousPeriodStart }
}

// Helper function to calculate net revenue
export function calculateNetRevenue(orders: Array<{ 
  items: Array<{ 
    productCode: string; 
    amount: Prisma.Decimal; 
  }>; 
  totalAmount?: Prisma.Decimal; 
}>): number {
  return orders.reduce((sum, order) => 
    sum + order.items.reduce((itemSum: number, item) => 
      !item.productCode.startsWith('SYS-') ? itemSum + Number(item.amount) : itemSum
    , 0)
  , 0)
}
