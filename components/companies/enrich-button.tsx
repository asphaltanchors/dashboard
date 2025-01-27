'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { enrichCompanyAction, fetchCompanies } from "@/app/actions/data"
import type { Company } from "@/lib/companies"
import { useRouter } from "next/navigation"

interface EnrichButtonProps {
  companies: Company[]
}

export function EnrichButton({ companies }: EnrichButtonProps) {
  const router = useRouter()
  const [isEnriching, setIsEnriching] = useState(false)
  const { toast } = useToast()

  const handleEnrich = async () => {
    try {
      setIsEnriching(true)
      const nonEnrichedCompanies = companies.filter(c => !c.enriched)
      
      for (const company of nonEnrichedCompanies) {
        const result = await enrichCompanyAction(company.domain)
        if (!result.success) {
          throw new Error(`Failed to enrich ${company.domain}: ${result.error}`)
        }
      }

      toast({
        title: "Success",
        description: "Companies enriched successfully",
      })
      
      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enrich companies",
        variant: "destructive",
      })
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      disabled={isEnriching}
      onClick={handleEnrich}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isEnriching ? "animate-spin" : ""}`} />
      Enrich All
    </Button>
  )
}
