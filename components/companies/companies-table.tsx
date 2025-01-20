"use client"

import React, { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Company } from "@/lib/companies"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CompaniesTableProps {
  companies: Company[]
}

export function CompaniesTable({ companies }: CompaniesTableProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.domain.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Companies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by name or domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead>Customers</TableHead>
              <TableHead>Enrichment Status</TableHead>
              <TableHead>Last Enriched</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies
              .slice((page - 1) * pageSize, page * pageSize)
              .map((company) => (
              <TableRow key={company.id}>
                <TableCell>{company.name}</TableCell>
                <TableCell>{company.domain}</TableCell>
                <TableCell>${company.totalOrders.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>{company.customerCount}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      company.enriched
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {company.enriched ? "Enriched" : "Pending"}
                  </span>
                </TableCell>
                <TableCell>
                  {company.enrichedAt ? new Date(company.enrichedAt).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>{company.enrichedSource || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredCompanies.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No companies found.</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredCompanies.length)} of {filteredCompanies.length} companies
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= filteredCompanies.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
