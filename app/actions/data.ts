'use server'

import { getCustomers } from "@/lib/customers"
import { getCompanies } from "@/lib/companies"
import { getOrders } from "@/lib/orders"

export type FetchParams = {
  page: number
  pageSize?: number
  searchTerm: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
}

export async function fetchCustomers({
  page,
  pageSize = 10,
  searchTerm,
  sortColumn,
  sortDirection,
}: FetchParams) {
  return getCustomers({
    page,
    pageSize,
    searchTerm,
    sortColumn,
    sortDirection,
  })
}

export async function fetchOrders({
  page,
  pageSize = 10,
  searchTerm,
  sortColumn,
  sortDirection,
}: FetchParams) {
  return getOrders({
    page,
    pageSize,
    searchTerm,
    sortColumn,
    sortDirection,
  })
}

export async function fetchCompanies({
  page,
  pageSize = 10,
  searchTerm,
  sortColumn,
  sortDirection,
}: FetchParams) {
  return getCompanies({
    page,
    pageSize,
    searchTerm,
    sortColumn,
    sortDirection,
  })
}
