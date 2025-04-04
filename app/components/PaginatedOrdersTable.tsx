"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

type Order = {
  orderNumber: string | null;
  customerName: string | null;
  companyName: string | null;
  companyDomain: string | null;
  companyId: string | null;
  orderDate: string | null;
  totalAmount: string | number | null;
  status: string | null;
  matchType: string | null;
  confidence: number | null;
};

interface PaginatedOrdersTableProps {
  orders: Order[];
  totalOrders: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  range: string;
  filter: string;
}

export function PaginatedOrdersTable({
  orders,
  totalOrders,
  currentPage,
  pageSize,
  searchQuery,
  range,
  filter,
}: PaginatedOrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  
  // Define available filters
  const filters = [
    { id: "all", label: "All Orders" },
    { id: "ar", label: "Accounts Receivable" },
  ];

  const totalPages = Math.ceil(totalOrders / pageSize);
  const showingFrom = totalOrders === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, totalOrders);

  // Status badge variant mapping
  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case "Paid":
        return "default";
      case "Pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Match type badge variant mapping
  const getMatchTypeVariant = (matchType: string | null) => {
    switch (matchType) {
      case "exact":
        return "default";
      case "fuzzy":
        return "secondary";
      case "manual":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new URLSearchParams object based on current params
    const params = new URLSearchParams(searchParams.toString());
    
    // Update or add search parameter
    if (localSearchQuery) {
      params.set("search", localSearchQuery);
    } else {
      params.delete("search");
    }
    
    // Reset to first page when searching
    params.set("page", "1");
    
    // Navigate with updated params, with scroll: false to prevent scrolling to top
    router.push(`/orders?${params.toString()}`, { scroll: false });
  };
  
  const handleFilterChange = (newFilter: string) => {
    // Create new URLSearchParams object based on current params
    const params = new URLSearchParams(searchParams.toString());
    
    // Update filter parameter
    if (newFilter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", newFilter);
    }
    
    // Reset to first page when changing filter
    params.set("page", "1");
    
    // Navigate with updated params, with scroll: false to prevent scrolling to top
    router.push(`/orders?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    // Create new URLSearchParams object based on current params
    const params = new URLSearchParams(searchParams.toString());
    
    // Update page parameter
    params.set("page", newPage.toString());
    
    // Navigate with updated params, with scroll: false to prevent scrolling to top
    router.push(`/orders?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <Input
            placeholder="Search by order # or customer name..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-2">
            {filters.map((filterOption) => (
              <Button
                key={filterOption.id}
                variant={filter === filterOption.id || (filterOption.id === "all" && !filter) ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange(filterOption.id)}
              >
                {filterOption.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {showingFrom} to {showingTo} of {totalOrders} orders
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => {
                // Format the date
                const orderDate = order.orderDate
                  ? new Date(order.orderDate)
                  : null;
                const formattedDate = orderDate
                  ? orderDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "N/A";

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/orders/${encodeURIComponent(
                          order.orderNumber ?? "" // Handle potential null order number
                        )}?range=${range}`}
                        className="text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {order.companyName ? (
                          <Link
                            href={`/companies/${encodeURIComponent(
                              order.companyId ?? "" // Handle potential null company ID
                            )}?range=${range}`}
                            className="text-primary hover:underline"
                          >
                            {order.companyName}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </div>
                      {order.companyDomain && (
                        <div className="text-xs text-muted-foreground">
                          {order.companyDomain}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(order.totalAmount))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
