'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RevenueData {
  month: string;
  orderCount: number;
  totalAmount: number;
  avgOrderValue: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  
  const [chartOptions, setChartOptions] = useState<ChartOptions<'line'>>({});

  useEffect(() => {
    // Sort data by month (ascending)
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    
    // For large datasets, we may want to reduce the number of labels shown
    let displayData = sortedData;
    let skipLabels = 1;
    
    // If we have more than 24 months, show fewer labels to avoid crowding
    if (sortedData.length > 24) {
      skipLabels = Math.ceil(sortedData.length / 24);
    }
    
    // Format month labels to be more readable
    const labels = sortedData.map((item, index) => {
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      
      // For large datasets, only show some labels to avoid crowding
      if (index % skipLabels !== 0 && index !== sortedData.length - 1) {
        return '';
      }
      
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    // Extract revenue values
    const revenueValues = sortedData.map(item => item.totalAmount);
    
    // Extract order count values
    const orderCountValues = sortedData.map(item => item.orderCount);
    
    setChartData({
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenueValues,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          yAxisID: 'y',
          tension: 0.3,
        },
        {
          label: 'Orders',
          data: orderCountValues,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          yAxisID: 'y1',
          tension: 0.3,
        }
      ]
    });
    
    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Revenue ($)',
            font: {
              weight: 'bold'
            }
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Orders',
            font: {
              weight: 'bold'
            }
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Monthly Revenue & Orders',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (label.includes('Revenue')) {
                  label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                } else {
                  label += new Intl.NumberFormat('en-US').format(context.parsed.y);
                }
              }
              return label;
            }
          }
        }
      },
    });
  }, [data]);

  return (
    <div className="w-full h-full">
      <Line options={chartOptions} data={chartData} />
    </div>
  );
}
