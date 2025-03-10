'use server'

import { getCanadianOrders, getAdhesiveOnlyOrders } from "@/lib/reports"
import { getCompanies } from "@/lib/companies"
import { getCustomers } from "@/lib/customers"
import { getOrders } from "@/lib/orders"
import { getProducts } from "@/lib/products"
import { enrichCompany } from "@/lib/enrichment"
import { getRecentOrders } from "@/lib/dashboard"

export async function fetchCanadianOrders(params: {
  page: number
  searchTerm: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}) {
  return getCanadianOrders({
    page: params.page,
    pageSize: 10,
    searchTerm: params.searchTerm,
    sortColumn: params.sortColumn,
    sortDirection: params.sortDirection,
    dateRange: params.dateRange,
    minAmount: params.minAmount,
    maxAmount: params.maxAmount,
    filterConsumer: params.filterConsumer
  })
}

export async function fetchCompanies(params: Parameters<typeof getCompanies>[0]) {
  return getCompanies(params)
}

export async function fetchCustomers(params: Parameters<typeof getCustomers>[0]) {
  return getCustomers(params)
}

export async function fetchOrders(params: Parameters<typeof getOrders>[0] & { filter?: string }) {
  const { filter, ...otherParams } = params
  return getOrders({
    ...otherParams,
    paymentStatusFilter: filter === 'unpaid-only' ? 'unpaid-only' : null
  })
}

export async function enrichCompanyAction(domain: string) {
  return enrichCompany(domain)
}

export async function fetchAdhesiveOrders(params: {
  page: number
  searchTerm: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  filterConsumer?: boolean
}) {
  return getAdhesiveOnlyOrders({
    page: params.page,
    pageSize: 10,
    searchTerm: params.searchTerm,
    sortColumn: params.sortColumn,
    sortDirection: params.sortDirection,
    dateRange: params.dateRange,
    minAmount: params.minAmount,
    maxAmount: params.maxAmount,
    filterConsumer: params.filterConsumer
  })
}

export async function fetchRecentOrders(params: {
  page: number
  searchTerm: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  dateRange?: string
  minAmount?: number
  maxAmount?: number
  pageSize?: number
  filterConsumer?: boolean
}) {
  return getRecentOrders({
    page: params.page,
    searchTerm: params.searchTerm,
    sortColumn: params.sortColumn,
    sortDirection: params.sortDirection,
    dateRange: params.dateRange,
    minAmount: params.minAmount,
    maxAmount: params.maxAmount,
    pageSize: params.pageSize || 5,
    filterConsumer: params.filterConsumer
  })
}

export async function fetchProducts(params: Parameters<typeof getProducts>[0]) {
  return getProducts(params)
}
