import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Users, DollarSign, Globe, Twitter, Facebook, Linkedin, Receipt } from "lucide-react"
import { SingleEnrichButton } from "@/components/companies/single-enrich-button"

interface EnrichedCompanyCardProps {
  enrichedData: any
  totalOrders: number
  domain: string
  isEnriched: boolean
}

export function EnrichedCompanyCard({ enrichedData, totalOrders, domain, isEnriched }: EnrichedCompanyCardProps) {
  if (!enrichedData) return null

  const { about = {}, socials = {}, finances = {}, analytics = {}, locations = {}, descriptions = {} } = enrichedData
  const companyName = about.name || domain || 'Unknown Company'
  const industries = about.industries || []
  const nameInitials = companyName.substring(0, 2).toUpperCase()

  return (
    <Card className="w-full max-w-3xl bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src="/placeholder.svg?height=80&width=80" alt={`${companyName} logo`} />
            <AvatarFallback>{nameInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-3xl font-bold text-slate-800">{companyName}</CardTitle>
            <CardDescription className="text-lg text-slate-600">
              {industries.length > 0 ? industries.slice(0, 2).join(" & ") : "Industry Unknown"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {about.yearFounded && (
              <Badge variant="secondary" className="text-sm font-medium">
                Est. {about.yearFounded}
              </Badge>
            )}
            <SingleEnrichButton domain={domain} isEnriched={isEnriched} />
          </div>
        </div>
        {industries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {industries.map((industry: string, index: number) => (
              <Badge key={index} variant="outline" className="bg-slate-100 text-slate-700">
                {industry.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">
              Revenue: {finances.revenue ? finances.revenue.toUpperCase() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">
              Employees: {about.totalEmployeesExact || about.totalEmployees || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium">
              HQ: {locations.headquarters ? 
                `${locations.headquarters.city?.name || ''}, ${locations.headquarters.state?.name || ''}, ${locations.headquarters.country?.name || ''}`.replace(/^, |, $/g, '') : 
                'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium">
              Monthly Visitors: {analytics.monthlyVisitors ? analytics.monthlyVisitors.split("-").join(" ").toUpperCase() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium">
              Total Orders: ${totalOrders.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        {descriptions.primary && (
          <p className="text-sm text-slate-700 mt-2">
            {descriptions.primary}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-slate-200 rounded-b-lg py-4">
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
    </Card>
  )
}
