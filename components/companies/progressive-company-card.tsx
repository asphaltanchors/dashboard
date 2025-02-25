import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Users, DollarSign, Globe, Twitter, Facebook, Linkedin, Building, Info } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { EnrichmentData } from "@/types/enrichment"

interface ProgressiveCompanyCardProps {
  domain: string
  name: string | null
  totalOrders: number
  customerCount: number
  enrichmentData?: EnrichmentData | null
  isEnriched: boolean
  enrichedAt?: Date | null
  enrichedSource?: string | null
}

export function ProgressiveCompanyCard({ 
  domain, 
  name, 
  totalOrders, 
  customerCount, 
  enrichmentData, 
  isEnriched,
  enrichedAt,
  enrichedSource
}: ProgressiveCompanyCardProps) {
  const companyName = enrichmentData?.about?.name || name || domain
  const nameInitials = companyName.substring(0, 2).toUpperCase()
  
  // Extract enrichment data with fallbacks
  const { 
    about = {}, 
    socials = {}, 
    finances = {}, 
    analytics = {}, 
    locations = {}, 
    descriptions = {},
    normalized_revenue = {}
  } = enrichmentData || {}
  
  const industries = about.industries || []
  const hasIndustries = industries.length > 0
  const hasDescription = !!descriptions.primary
  const hasLocation = !!locations.headquarters?.city?.name || 
                     !!locations.headquarters?.state?.name || 
                     !!locations.headquarters?.country?.name
  const hasSocials = !!socials.twitter?.url || !!socials.facebook?.url || !!socials.linkedin?.url
  
  // Format location string if available
  const locationString = hasLocation ? 
    `${locations.headquarters?.city?.name || ''}, ${locations.headquarters?.state?.name || ''}, ${locations.headquarters?.country?.name || ''}`.replace(/^, |, $/g, '') : 
    null

  return (
    <Card className="w-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg flex flex-col h-full">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src="/placeholder.svg?height=80&width=80" alt={`${companyName} logo`} />
            <AvatarFallback>{nameInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-3xl font-bold text-slate-800">{companyName}</CardTitle>
            <CardDescription className="text-lg text-slate-600">
              {hasIndustries ? industries.slice(0, 2).join(" & ") : domain}
            </CardDescription>
            {isEnriched && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Enriched
                </Badge>
                {enrichedAt && (
                  <span className="text-xs text-slate-500">
                    {new Date(enrichedAt).toLocaleDateString()}
                  </span>
                )}
                {enrichedSource && (
                  <span className="text-xs text-slate-500">
                    via {enrichedSource}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {about.yearFounded && (
              <Badge variant="secondary" className="text-sm font-medium">
                Est. {about.yearFounded}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Industries section - only shown if available */}
        {hasIndustries && (
          <div className="flex flex-wrap gap-2">
            {industries.map((industry, index: number) => (
              <Badge key={index} variant="outline" className="bg-slate-100 text-slate-700">
                {typeof industry === 'string' 
                  ? industry.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
                  : industry}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="grid gap-4 pb-6">
        {/* Core metrics - always shown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">
              Orders: {formatCurrency(totalOrders)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">
              Customers: {customerCount}
            </span>
          </div>
          
          {/* Enriched metrics - only shown if available */}
          {about.totalEmployeesExact || about.totalEmployees ? (
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium">
                Employees: {about.totalEmployeesExact || about.totalEmployees}
              </span>
            </div>
          ) : null}
          
          {hasLocation ? (
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">
                HQ: {locationString}
              </span>
            </div>
          ) : null}
          
          {/* Show exact revenue if available, otherwise show revenue range */}
          {normalized_revenue.exact ? (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">
                Annual Revenue: ${Math.round(normalized_revenue.exact).toLocaleString()}
              </span>
            </div>
          ) : normalized_revenue.range ? (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">
                Est. Revenue: {normalized_revenue.range}
              </span>
            </div>
          ) : finances.revenue ? (
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">
                Est. Revenue: {typeof finances.revenue === 'string' ? finances.revenue.toUpperCase() : finances.revenue}
              </span>
            </div>
          ) : null}
          
          {analytics.monthlyVisitors ? (
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium">
                Monthly Visitors: {typeof analytics.monthlyVisitors === 'string' ? 
                  analytics.monthlyVisitors.split("-").join(" ").toUpperCase() : 
                  analytics.monthlyVisitors}
              </span>
            </div>
          ) : null}
        </div>
        
        {/* Company description - only shown if available */}
        {hasDescription && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">About</span>
            </div>
            <p className="text-sm text-slate-700">
              {descriptions.primary}
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Footer with social links - only shown if available */}
      {hasSocials && (
        <CardFooter className="flex justify-between items-center bg-slate-200 rounded-b-lg py-4 mt-auto">
          <div className="flex gap-4">
            {socials.twitter?.url && (
              <a
                href={socials.twitter.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-blue-400"
              >
                <Twitter className="w-5 h-5" />
              </a>
            )}
            {socials.facebook?.url && (
              <a
                href={socials.facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-blue-600"
              >
                <Facebook className="w-5 h-5" />
              </a>
            )}
            {socials.linkedin?.url && (
              <a
                href={socials.linkedin.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-blue-700"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
          </div>
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            {domain}
          </a>
        </CardFooter>
      )}
      
      {/* Alternative footer if no social links */}
      {!hasSocials && (
        <CardFooter className="flex justify-end items-center bg-slate-200 rounded-b-lg py-4 mt-auto">
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            {domain}
          </a>
        </CardFooter>
      )}
    </Card>
  )
}
