"use client"

import { useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface Props {
  defaultValue?: number
}

export function PeriodSelector({ defaultValue = 6 }: Props) {
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const months = Number(formData.get("months"))
    
    if (months < 1 || months > 24) {
      return // Could add error handling here
    }

    startTransition(() => {
      // Update URL and force a full page reload
      const params = new URLSearchParams(searchParams)
      params.set("months", months.toString())
      window.location.href = `?${params.toString()}`
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          name="months"
          defaultValue={defaultValue}
          min={1}
          max={24}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">months</span>
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Update"
        )}
      </Button>
    </form>
  )
}
