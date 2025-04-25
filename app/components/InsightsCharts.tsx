"use client"

import { useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import { createRoot } from 'react-dom/client'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Define types for our data
type IndustryData = {
  industry: string
  count: number
  percentage: number
}

type SourceChannelData = {
  sourceChannel: string
  count: number
  percentage: number
}

// Define color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1']

// Industry chart config
const createIndustryChartConfig = (data: IndustryData[]): ChartConfig => {
  const config: ChartConfig = {
    count: {
      label: "Orders",
    }
  }
  
  data.forEach((item, index) => {
    config[item.industry] = {
      label: item.industry,
      color: COLORS[index % COLORS.length]
    }
  })
  
  return config
}

// Source channel chart config
const createSourceChannelChartConfig = (data: SourceChannelData[]): ChartConfig => {
  const config: ChartConfig = {
    count: {
      label: "Orders",
    }
  }
  
  data.forEach((item, index) => {
    config[item.sourceChannel] = {
      label: item.sourceChannel,
      color: COLORS[index % COLORS.length]
    }
  })
  
  return config
}

// Relationship chart config
const createRelationshipChartConfig = (channels: string[]): ChartConfig => {
  const config: ChartConfig = {
    industry: {
      label: "Industry",
    }
  }
  
  channels.forEach((channel, index) => {
    config[channel] = {
      label: channel,
      color: COLORS[index % COLORS.length]
    }
  })
  
  return config
}

export function IndustryChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chartElement = document.getElementById('industry-chart')
    if (!chartElement) return

    const chartData = JSON.parse(chartElement.getAttribute('data-chart') || '[]')
    if (chartData.length === 0) return

    const config = createIndustryChartConfig(chartData)
    
    const formattedData = chartData.map((item: IndustryData) => ({
      name: item.industry,
      count: item.count,
      fill: config[item.industry]?.color
    }))

    chartRef.current.innerHTML = ''
    
    const reactRoot = createRoot(chartRef.current)
    reactRoot.render(
      <ChartContainer config={config} className="mx-auto aspect-square h-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={formattedData}
            dataKey="count"
            nameKey="name"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
          >
            {formattedData.map((entry: { fill: string, name: string, count: number }, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ChartContainer>
    )
  }, [])

  return <div ref={chartRef} className="h-full w-full" />
}

export function SourceChannelChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chartElement = document.getElementById('sourcechannel-chart')
    if (!chartElement) return

    const chartData = JSON.parse(chartElement.getAttribute('data-chart') || '[]')
    if (chartData.length === 0) return

    const config = createSourceChannelChartConfig(chartData)
    
    const formattedData = chartData.map((item: SourceChannelData) => ({
      name: item.sourceChannel,
      count: item.count,
      fill: config[item.sourceChannel]?.color
    }))

    chartRef.current.innerHTML = ''
    
    const reactRoot = createRoot(chartRef.current)
    reactRoot.render(
      <ChartContainer config={config} className="mx-auto aspect-square h-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={formattedData}
            dataKey="count"
            nameKey="name"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
          >
            {formattedData.map((entry: { fill: string, name: string, count: number }, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ChartContainer>
    )
  }, [])

  return <div ref={chartRef} className="h-full w-full" />
}

export function RelationshipChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chartElement = document.getElementById('relationship-chart')
    if (!chartElement) return

    const chartData = JSON.parse(chartElement.getAttribute('data-chart') || '[]')
    const channels = JSON.parse(chartElement.getAttribute('data-channels') || '[]')
    if (chartData.length === 0 || channels.length === 0) return

    const config = createRelationshipChartConfig(channels)

    chartRef.current.innerHTML = ''
    
    const reactRoot = createRoot(chartRef.current)
    reactRoot.render(
      <ChartContainer config={config} className="h-full w-full">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <XAxis dataKey="industry" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {channels.map((channel: string, index: number) => (
            <Bar 
              key={channel} 
              dataKey={channel} 
              stackId="a" 
              fill={COLORS[index % COLORS.length]} 
            />
          ))}
        </BarChart>
      </ChartContainer>
    )
  }, [])

  return <div ref={chartRef} className="h-full w-full" />
}

export default function InsightsCharts() {
  return null // This component is just a namespace for the chart components
}
