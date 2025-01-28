'use server'

import { getCompanyOrderMetrics } from "@/lib/reports"
import { getCompanies } from "@/lib/companies"

export async function getPopAndDropData(months: number) {
  if (months < 1 || months > 24) {
    throw new Error("Period must be between 1 and 24 months")
  }
  
  return getCompanyOrderMetrics(months)
}

export async function fetchCompanies(params: Parameters<typeof getCompanies>[0]) {
  return getCompanies(params)
}
