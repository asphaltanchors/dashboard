"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type Product = {
  productCode: string | null;
  productDescription: string | null;
  totalProductsSold: number;
  totalSales: number;
  productFamily?: string | null;
  materialType?: string | null;
  orderCount?: number;
};

interface SearchableProductsTableProps {
  products: Product[];
}

export function SearchableProductsTable({ products }: SearchableProductsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      (product.productCode?.toLowerCase().includes(query) || false) ||
      (product.productDescription?.toLowerCase().includes(query) || false) ||
      (product.productFamily?.toLowerCase().includes(query) || false) ||
      (product.materialType?.toLowerCase().includes(query) || false)
    );
  });

  return (
    <div className="space-y-4">
      <div>
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Product Line</TableHead>
            <TableHead>Material</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Products Sold</TableHead>
            <TableHead className="text-right">Total Sales</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                No products found matching your search
              </TableCell>
            </TableRow>
          ) : (
            filteredProducts.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {product.productCode ? (
                    <Link 
                      href={`/products/${encodeURIComponent(product.productCode)}`} 
                      className="font-medium hover:underline"
                    >
                      {product.productCode}
                    </Link>
                  ) : (
                    <span>Unknown</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-72">{product.productDescription}</TableCell>
                <TableCell>{product.productFamily || "—"}</TableCell>
                <TableCell>{product.materialType || "—"}</TableCell>
                <TableCell className="text-right">{product.orderCount?.toLocaleString() || "0"}</TableCell>
                <TableCell className="text-right">{Math.round(Number(product.totalProductsSold)).toLocaleString()}</TableCell>
                <TableCell className="text-right">${Math.round(Number(product.totalSales)).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
