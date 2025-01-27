'use client'

import { ToastProvider } from "@/components/ui/use-toast"
import { SidebarProvider } from "@/components/ui/sidebar"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <ToastProvider>{children}</ToastProvider>
    </SidebarProvider>
  )
}
