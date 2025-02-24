import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Company } from "@/lib/companies"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

interface CompanyCardProps {
  company: Company
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link href={`/c2/${company.domain}`}>
      <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
        <CardHeader>
          <CardTitle className="truncate">
            {company.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-medium">{formatCurrency(company.totalOrders)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customers</span>
              <span className="font-medium">{company.customerCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Domain</span>
              <span className="font-medium">{company.domain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Enriched</span>
              <span className="font-medium">{company.enriched ? "Yes" : "No"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
