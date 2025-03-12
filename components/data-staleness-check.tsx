'use client'

import { useDataStalenessCheck } from '@/hooks/use-data-staleness-check'

export function DataStalenessCheck({ isStale }: { isStale: boolean }) {
  useDataStalenessCheck(isStale)
  return null
}
