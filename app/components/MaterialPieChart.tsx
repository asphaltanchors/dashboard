"use client"

import { TrendingUp } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

type MaterialData = {
  material: string;
  value?: number;
  count?: number;
  percentage?: number;
  fill?: string; // Make fill optional
}

interface MaterialPieChartProps {
  materialData: MaterialData[];
  timeframe: string;
}

// Define colors for different materials with explicit values
const materialColors = {
  // Exact matches for the database values
  "zinc plated": "#3b82f6", // blue
  "stainless steel": "#64748b", // slate
  "plastic": "#f97316", // orange
  "adhesives": "#22c55e", // green
  "tools": "#a855f7", // purple
  "dacromet": "#ec4899", // pink
  
  // Default fallbacks
  "metal": "#3b82f6", // blue
  "steel": "#64748b", // slate
  "wood": "#22c55e", // green
  "glass": "#a855f7", // purple
  "composite": "#ec4899", // pink
  "other": "#94a3b8", // slate-400
}

// Helper function to get color for a material
const getMaterialColor = (material: string): string => {
  if (!material) return "#94a3b8"; // Default color for null/undefined
  
  // Convert to lowercase for case-insensitive matching
  const materialLower = material.toLowerCase();
  
  // Check for exact match
  if (materialLower in materialColors) {
    return materialColors[materialLower as keyof typeof materialColors];
  }
  
  // Check for partial matches
  if (materialLower.includes("zinc") || materialLower.includes("plated")) {
    return materialColors["zinc plated"];
  }
  
  if (materialLower.includes("steel") || materialLower.includes("stainless")) {
    return materialColors["stainless steel"];
  }
  
  if (materialLower.includes("plastic")) {
    return materialColors["plastic"];
  }
  
  if (materialLower.includes("adhesive") || materialLower.includes("glue")) {
    return materialColors["adhesives"];
  }
  
  if (materialLower.includes("tool")) {
    return materialColors["tools"];
  }
  
  if (materialLower.includes("dacromet")) {
    return materialColors["dacromet"];
  }
  
  // Default color
  return "#94a3b8"; // slate-400
}

// Create a dynamic chart config based on the materials in the data
const createChartConfig = (materialData: MaterialData[]): ChartConfig => {
  const config: Record<string, any> = {
    count: {
      label: "Count",
    },
  }
  
  materialData.forEach((item) => {
    config[item.material] = {
      label: item.material,
      color: getMaterialColor(item.material),
    }
  })
  
  return config as ChartConfig
}

export function MaterialPieChart({ materialData, timeframe }: MaterialPieChartProps) {
  // Process data to ensure numbers and add fill colors
  const processedData = materialData.map(item => ({
    material: item.material,
    count: item.percentage || 0, // Use percentage for the pie chart
    value: item.value || 0,
    percentage: item.percentage || 0,
    // Don't set fill here, it will be handled by the chart config
  }))
  
  const chartConfig = createChartConfig(processedData)
  
  const totalRevenue = processedData.reduce((sum, item) => sum + (item.value || 0), 0)
  
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Revenue by Material</CardTitle>
        <CardDescription>{timeframe}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {processedData.length === 0 ? (
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            No material data available
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name, entry) => {
                        const item = entry.payload;
                        return [`${item.percentage}% ($${Number(item.value).toLocaleString()})`, item.material];
                      }}
                    />
                  }
                />
                <Pie
                  data={processedData}
                  dataKey="count"
                  nameKey="material"
                  innerRadius={60}
                  paddingAngle={2}
                  cornerRadius={4}
                  isAnimationActive={true}
                >
                  {processedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getMaterialColor(entry.material)}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          ${totalRevenue.toLocaleString()} total revenue <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing revenue distribution by material type
        </div>
      </CardFooter>
    </Card>
  )
}
