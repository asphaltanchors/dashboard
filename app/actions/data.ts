'use server'

import { getCompanyOrderMetrics } from "@/lib/reports"
import { getCompanies } from "@/lib/companies"
import { getCustomers } from "@/lib/customers"
import { getOrders } from "@/lib/orders"
import { enrichCompany } from "@/lib/enrichment"

export async function getPopAndDropData(months: number) {
  if (months < 1 || months > 24) {
    throw new Error("Period must be between 1 and 24 months")
  }
  
  return getCompanyOrderMetrics(months)
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
