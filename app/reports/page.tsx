import Link from "next/link"
import { BarChart3, Beaker, PieChart } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="p-8">
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            View and analyze business metrics
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link 
            href="/reports/adhesive-only-orders"
            className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="rounded-lg border p-2">
              <Beaker className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Adhesive Only Orders</h2>
              <p className="text-sm text-muted-foreground">
                View customers who exclusively order adhesive products
              </p>
            </div>
          </Link>

          <Link 
            href="/reports/pop-and-drop"
            className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="rounded-lg border p-2">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Pop & Drop</h2>
              <p className="text-sm text-muted-foreground">
                Track companies with significant order volume changes
              </p>
            </div>
          </Link>

          <Link 
            href="/reports/channel-analysis"
            className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="rounded-lg border p-2">
              <PieChart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Channel Analysis</h2>
              <p className="text-sm text-muted-foreground">
                Analyze sales performance across different channels
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
