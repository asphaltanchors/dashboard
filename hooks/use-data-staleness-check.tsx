'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'

export function useDataStalenessCheck(isStale: boolean) {
  const { toast } = useToast()
  
  useEffect(() => {
    if (isStale) {
      toast({
        title: "Warning",
        description: "Data Import may be stale. Check SaasAnt",
        variant: "destructive"
      })
    }
  }, [isStale, toast])
}
