import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Company } from "@/lib/companies"
import { EnrichmentData } from "@/types/enrichment"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"

interface CompanyCardProps {
  company: Company
}

export function CompanyCard({ company }: CompanyCardProps) {
  // Get top category from enrichment data if available
  const getTopCategory = () => {
    if (!company.enriched || !company.enrichmentData) return null;
    
    try {
      // Cast enrichmentData to EnrichmentData type to help TypeScript
      const enrichmentData = company.enrichmentData as EnrichmentData;
      
      // Try to get categories from different possible locations in the enrichment data
      const categoriesAndKeywords = enrichmentData.categories_and_keywords;
      const industries = enrichmentData.about?.industries;
      const industry = enrichmentData.industry;
      
      // Prioritize industry first, then fall back to other options
      if (industry) {
        return industry;
      } else if (Array.isArray(categoriesAndKeywords) && categoriesAndKeywords.length > 0) {
        return categoriesAndKeywords[0];
      } else if (Array.isArray(industries) && industries.length > 0) {
        return industries[0];
      }
    } catch (error) {
      console.error("Error getting top category:", error);
      return null;
    }
    
    return null;
  };

  // Get company logo from enrichment data if available
  const getCompanyLogo = () => {
    if (!company.enriched || !company.enrichmentData) return null;
    
    try {
      // Access the company_logo field from the raw enrichment data
      const logo = (company.enrichmentData as EnrichmentData).company_logo;
      return logo || null;
    } catch (error) {
      console.error("Error getting company logo:", error);
      return null;
    }
  };
  
  // Safely handle the top category
  const topCategory = getTopCategory();
  
  // Ensure we're not trying to render an object directly
  const formatTopCategory = (category: unknown) => {
    try {
      if (typeof category === 'string') {
        return category.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
      }
      if (category && typeof category === 'object') {
        return "Category";  // Just display a generic label for objects
      }
      return String(category || "");
    } catch (error) {
      console.error("Error formatting category:", error);
      return "";
    }
  };

  // Get the company logo
  const companyLogo = getCompanyLogo();

  return (
    <Link href={`/companies/${company.domain}`}>
      <Card className="transition-all hover:shadow-lg hover:-translate-y-1">
        <CardHeader>
          <div className="flex items-center gap-4">
            {companyLogo && (
              <div className="flex-shrink-0 w-12 h-12 overflow-hidden rounded-md border border-slate-200">
                <Image 
                  src={`data:image/jpeg;base64,${companyLogo.replace(/\r\n/g, '')}`} 
                  alt={`${company.name} logo`}
                  className="w-full h-full object-contain"
                  width={48}
                  height={48}
                />
              </div>
            )}
            <CardTitle className="truncate">
              {company.name}
            </CardTitle>
          </div>
          {company.enriched && (company.enrichmentData as EnrichmentData)?.about?.industries && ((company.enrichmentData as EnrichmentData)?.about?.industries?.length ?? 0) > 0 && (
            <div className="mt-1">
              <Badge variant="outline" className="bg-slate-100 text-slate-700">
                {typeof (company.enrichmentData as EnrichmentData)?.about?.industries?.[0] === 'string' 
                  ? (company.enrichmentData as EnrichmentData)?.about?.industries?.[0].split("-").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
                  : (company.enrichmentData as EnrichmentData)?.about?.industries?.[0]}
              </Badge>
            </div>
          )}
          {topCategory && (
            <div className="mt-1">
              <Badge variant="outline" className="bg-slate-100 text-slate-700">
                {formatTopCategory(topCategory)}
              </Badge>
            </div>
          )}
          
          {/* Display revenue range if available */}
          {company.enriched && (company.enrichmentData as EnrichmentData)?.normalized_revenue?.range && (
            <div className="mt-1">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {(company.enrichmentData as EnrichmentData).normalized_revenue?.range}
              </Badge>
            </div>
          )}
          
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Orders</span>
              <span className="font-medium">{formatCurrency(company.totalOrders)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
