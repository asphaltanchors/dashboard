"use client"

import * as React from "react"
import {
  IconDashboard,
  IconDatabase,
  IconFileDescription,
  IconFolder,
  IconInnerShadowTop,
  IconUsers,
  IconChartPie,
  IconUserCircle,
} from "@tabler/icons-react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Products",
      url: "/products",
      icon: IconDatabase,
    },
    {
      title: "Product Families",
      url: "/product-families",
      icon: IconFolder,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: IconFileDescription,
    },
    {
      title: "Companies",
      url: "/companies",
      icon: IconUsers,
    },
    {
      title: "Insights",
      url: "/insights",
      icon: IconChartPie,
    },
    {
      title: "People",
      url: "/people",
      icon: IconUserCircle,
    },
  ],
  documents: [
    {
      name: "Orders",
      url: "/orders",
      icon: IconFileDescription,
    },
    {
      name: "Products",
      url: "/products",
      icon: IconDatabase,
    },
    {
      name: "Companies", 
      url: "/companies",
      icon: IconUsers,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Dash Analytics</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
    </Sidebar>
  )
}
