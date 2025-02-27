"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import { useState } from "react"

interface MonthlyRevenueChartProps {
  data: Array<{
    month: number
    year: number
    revenue: number
    classTotals: Record<string, number>
  }>
}

// Define a set of colors for the different classes using Tailwind variables
const CLASS_COLORS: Record<string, string> = {
  'OEM': 'hsl(var(--chart-oem))',
  'eStore': 'hsl(var(--chart-estore))',
  'Distributor': 'hsl(var(--chart-distributor))',
  'Retail': 'hsl(var(--chart-retail))',
  'Wholesale': 'hsl(var(--chart-wholesale))',
  'Unclassified': 'hsl(var(--chart-unclassified))'
}

// Fallback colors for any additional classes
const FALLBACK_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
]

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  // State to track which classes are visible
  const [hiddenClasses, setHiddenClasses] = useState<Set<string>>(new Set(['EXPORT from WWD']))

  // Calculate total revenue for each class across all months
  const classTotals: Record<string, number> = {}
  data.forEach(item => {
    Object.entries(item.classTotals).forEach(([className, amount]) => {
      classTotals[className] = (classTotals[className] || 0) + amount
    })
  })

  // Extract all unique class names from the data, filtering out very small classes
  const totalRevenue = Object.values(classTotals).reduce((sum, amount) => sum + amount, 0)
  const significantClasses = Object.entries(classTotals)
    .filter(([className, amount]) => {
      // Hide classes that are less than 1% of total revenue or explicitly hidden
      return (amount / totalRevenue >= 0.01) && !hiddenClasses.has(className)
    })
    .map(([className]) => className)

  // Format data for the chart
  const formattedData = data.map(item => {
    const date = new Date(item.year, item.month)
    const result: Record<string, any> = {
      name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      total: item.revenue // Keep total for reference
    }
    
    // Add each significant class's revenue to the data point
    significantClasses.forEach(className => {
      result[className] = item.classTotals[className] || 0
    })
    
    return result
  })

  // Calculate max value for Y axis with some padding
  const maxRevenue = Math.max(...data.map(d => d.revenue)) * 1.2

  // Get color for a class, using predefined colors or fallbacks
  const getClassColor = (className: string, index: number): string => {
    if (CLASS_COLORS[className]) {
      return CLASS_COLORS[className]
    }
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  }

  // Handle legend click to toggle visibility
  const handleLegendClick = (entry: any) => {
    const className = entry.dataKey
    const newHiddenClasses = new Set(hiddenClasses)
    
    if (hiddenClasses.has(className)) {
      newHiddenClasses.delete(className)
    } else {
      newHiddenClasses.add(className)
    }
    
    setHiddenClasses(newHiddenClasses)
  }

  // Get all significant classes for the legend (excluding very small ones like 'EXPORT from WWD')
  const allSignificantClasses = Object.entries(classTotals)
    .filter(([className, amount]) => {
      // Only filter out classes that are less than 1% of total revenue
      // But keep 'EXPORT from WWD' in the hidden set
      return className !== 'EXPORT from WWD' && amount / totalRevenue >= 0.01
    })
    .map(([className]) => className)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue by Class (Last 18 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={formattedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
                barCategoryGap="5%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  domain={[0, maxRevenue]}
                  tickMargin={10}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      // Calculate total for this month
                      const total = payload.reduce(
                        (sum, entry) => sum + (entry.value as number), 
                        0
                      )
                      
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="mb-2">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Month
                            </span>
                            <span className="ml-2 font-bold text-muted-foreground">
                              {label}
                            </span>
                          </div>
                          
                          {/* Show each class with its value */}
                          {payload.map((entry, index) => (
                            <div key={`item-${index}`} className="flex justify-between items-center py-1">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 mr-2 rounded-full" 
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-sm">{entry.name}</span>
                              </div>
                              <span className="font-medium">
                                {formatCurrency(entry.value as number)}
                              </span>
                            </div>
                          ))}
                          
                          {/* Show total */}
                          <div className="mt-2 pt-2 border-t flex justify-between items-center">
                            <span className="font-medium">Total</span>
                            <span className="font-bold">
                              {formatCurrency(total)}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                
                {/* Create a Bar for each visible class */}
                {significantClasses.map((className, index) => (
                  <Bar
                    key={className}
                    dataKey={className}
                    name={className}
                    stackId="a"
                    fill={getClassColor(className, index)}
                    radius={index === significantClasses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={50}
                  />
                ))}
                
                {/* Add hidden bars with zero height for classes that should appear in legend but are hidden */}
                {allSignificantClasses
                  .filter(className => hiddenClasses.has(className))
                  .map((className, index) => (
                    <Bar
                      key={`hidden-${className}`}
                      dataKey={className}
                      name={className}
                      // Don't use stackId so it doesn't affect the stacking
                      fill={getClassColor(className, index)}
                      // Hide the bar but keep it in the legend
                      hide={true}
                    />
                  ))}
                
                {/* Add the Legend after the bars so it can access all the data series */}
                <Legend 
                  onClick={handleLegendClick}
                  formatter={(value, entry, index) => {
                    // Add visual indication that legend items are clickable
                    const isHidden = hiddenClasses.has(value as string)
                    return (
                      <span style={{ 
                        color: isHidden ? 'hsl(var(--muted-foreground))' : undefined, 
                        textDecoration: isHidden ? 'line-through' : undefined,
                        cursor: 'pointer'
                      }}>
                        {value}
                      </span>
                    )
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
