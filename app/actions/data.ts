'use server'

import { getCanadianOrders } from "@/lib/reports"
import { getCompanies } from "@/lib/companies"
import { getCustomers } from "@/lib/customers"
import { getOrders } from "@/lib/orders"
import { enrichCompany } from "@/lib/enrichment"

export async function fetchCanadianOrders(params: {
  page: number
  searchTerm: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  dateRange?: string
  minAmount?: number
  maxAmount?: number
}) {
  return getCanadianOrders({
    page: params.page,
    pageSize: 10,
    searchTerm: params.searchTerm,
    sortColumn: params.sortColumn,
    sortDirection: params.sortDirection,
    dateRange: params.dateRange,
    minAmount: params.minAmount,
    maxAmount: params.maxAmount
  })
}

export async function fetchCompanies(params: Parameters<typeof getCompanies>[0]) {
  return getCompanies(params)
}

export async function fetchCustomers(params: Parameters<typeof getCustomers>[0]) {
  return getCustomers(params)
}

export async function fetchOrders(params: Parameters<typeof getOrders>[0]) {
  return getOrders(params)
}

export async function enrichCompanyAction(domain: string) {
  return enrichCompany(domain)
}
