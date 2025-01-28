"use client"

import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTable } from "@/components/ui/data-table"

interface Customer {
  id: string
  customerName: string
  companyName: string | null
  companyDomain: string | null
  orderCount: number
  orders: Array<{ id: string; orderNumber: string }>
  totalSpent: number
}

interface Props {
  customers: Customer[]
}

export function AdhesiveOnlyOrdersTable({ customers }: Props) {
  return (
    <DataTable
      data={customers}
      columns={[
        {
          header: "Customer Name",
          accessorKey: "customerName",
          sortable: true,
          cell: (customer: Customer) => (
            <Link 
              href={`/customers/${customer.id}`}
              className="text-blue-600 hover:underline"
            >
              {customer.customerName}
            </Link>
          )
        },
        {
          header: "Company",
          accessorKey: "companyName",
          sortable: true,
          cell: (customer: Customer) => 
            customer.companyDomain ? (
              <Link 
                href={`/companies/${customer.companyDomain}`}
                className="text-blue-600 hover:underline"
              >
                {customer.companyName}
              </Link>
            ) : (
              '-'
            )
        },
        {
          header: "Number of Orders",
          accessorKey: "orderCount",
          sortable: true,
          cell: (customer: Customer) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {customer.orderCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-1">
                    {customer.orders.map(order => (
                      <Link 
                        key={order.id}
                        href={`/orders/${order.orderNumber}`}
                        className="text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Order #{order.orderNumber}
                      </Link>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
        {
          header: "Total Spent",
          accessorKey: "totalSpent",
          sortable: true,
          cell: (customer: Customer) => 
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(customer.totalSpent)
        }
      ]}
    />
  )
}
