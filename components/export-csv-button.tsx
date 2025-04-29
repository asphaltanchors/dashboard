"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface CustomerData {
  email: string;
  firstName: string;
  lastName: string;
  customerName: string;
  orderCount: string;
  totalSpent: string;
  lastOrderDate: string;
  channel: string;
  extras?: string; // Optional JSON string for compact encoding
}

interface ExportCSVButtonProps {
  data: CustomerData[];
  filename?: string;
  className?: string;
}

export function ExportCSVButton({
  data,
  filename = "export.csv",
  className,
}: ExportCSVButtonProps) {
  const handleExport = () => {
    if (!data.length) {
      console.warn("No data to export");
      return;
    }

    // Transform data to the required format
    const transformedData = data.map(person => {
      // If extras is provided, parse it first (if it's a string) to avoid double-escaping
      let attributesObj;
      if (person.extras) {
        try {
          // If extras is already a JSON string, parse it
          attributesObj = typeof person.extras === 'string' ? JSON.parse(person.extras) : person.extras;
        } catch (e) {
          // If parsing fails, use the string directly
          attributesObj = person.extras;
        }
      } else {
        // Generate default attributes
        attributesObj = {
          customerName: person.customerName,
          orderCount: person.orderCount,
          totalSpent: person.totalSpent,
          lastOrderDate: person.lastOrderDate,
          channel: person.channel
        };
      }
      
      // Convert to JSON string
      const jsonString = JSON.stringify(attributesObj);
      
      // Double-escape the JSON for CSV format
      const doubleEscapedJson = jsonString.replace(/"/g, '""');
      
      return {
        email: person.email,
        name: person.firstName && person.lastName 
          ? `${person.firstName} ${person.lastName}`
          : person.customerName,
        attributes: doubleEscapedJson
      };
    });
    
    // Get headers from the first row
    const headers = Object.keys(transformedData[0]);
    
    // Create CSV content
    const csvContent = [
      // Headers row
      headers.join(","),
      // Data rows
      ...transformedData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row] || "";
          
          // Special handling for attributes column which is already double-escaped
          if (header === 'attributes') {
            return `"${value}"`;
          }
          
          // For other columns, escape quotes and wrap in quotes if contains comma or quotes
          const escaped = value.replace(/"/g, '""');
          return value.includes(",") || value.includes('"') 
            ? `"${escaped}"` 
            : value;
        }).join(",")
      )
    ].join("\n");
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
