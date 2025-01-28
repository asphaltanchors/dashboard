"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface CustomerRevenueCardProps {
  data: Array<{
    year: number;
    revenue: number;
  }>;
}

export function CustomerRevenueCard({ data }: CustomerRevenueCardProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Customer Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="year" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{ background: "#333", border: "none" }}
                labelStyle={{ color: "#fff" }}
                formatter={(value) => [`$${value}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">Yearly Breakdown</p>
          {data.map((item) => (
            <div key={item.year} className="flex justify-between items-center">
              <span className="font-medium">{item.year}</span>
              <span className="text-green-600 font-semibold">${item.revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total Revenue</span>
            <span className="text-2xl text-green-600 font-bold">${totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
