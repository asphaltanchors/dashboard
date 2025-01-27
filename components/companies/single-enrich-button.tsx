'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { enrichCompanyAction } from "@/app/actions/data"
import { useRouter } from "next/navigation"

interface SingleEnrichButtonProps {
  domain: string
  isEnriched: boolean
}

export function SingleEnrichButton({ domain, isEnriched }: SingleEnrichButtonProps) {
  const [isEnriching, setIsEnriching] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleEnrich = async () => {
    try {
      setIsEnriching(true)
      const result = await enrichCompanyAction(domain)
      if (!result.success) {
        throw new Error(`Failed to enrich ${domain}: ${result.error}`)
      }

      toast({
        title: "Success",
        description: "Company enriched successfully",
      })
      
      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enrich company",
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
      className="ml-4"
      disabled={isEnriching || isEnriched}
      onClick={handleEnrich}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isEnriching ? "animate-spin" : ""}`} />
      {isEnriched ? "Enriched" : "Enrich"}
    </Button>
  )
}
