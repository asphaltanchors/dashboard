'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type TimeFrame = {
  label: string;
  value: string;
  period: number;
  unit: 'days' | 'months' | 'years' | 'custom';
};

const TIME_FRAMES: TimeFrame[] = [
  { label: 'Last 7 days', value: '7d', period: 7, unit: 'days' },
  { label: 'Last 30 days', value: '30d', period: 30, unit: 'days' },
  { label: 'Last 90 days', value: '90d', period: 90, unit: 'days' },
  { label: 'Last 6 months', value: '6m', period: 6, unit: 'months' },
  { label: 'Last 12 months', value: '12m', period: 12, unit: 'months' },
  { label: 'Year to date', value: 'ytd', period: 1, unit: 'years' },
  { label: 'All time', value: 'all', period: 0, unit: 'custom' },
  { label: 'Custom range', value: 'custom', period: 0, unit: 'custom' },
];

export default function TimeFramePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get timeframe from URL or default to 30d
  const currentTimeFrame = searchParams.get('timeframe') || '30d';
  
  // State for custom date range picker
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Get current selected timeframe label
  const currentTimeFrameLabel = TIME_FRAMES.find(
    tf => tf.value === currentTimeFrame
  )?.label || 'Last 30 days';
  
  // When timeframe changes to custom and we have start/end dates in the URL
  useEffect(() => {
    if (currentTimeFrame === 'custom') {
      const urlStartDate = searchParams.get('start');
      const urlEndDate = searchParams.get('end');
      
      if (urlStartDate) setStartDate(urlStartDate);
      if (urlEndDate) setEndDate(urlEndDate);
      
      if (urlStartDate && urlEndDate) {
        setShowCustomPicker(true);
      }
    }
  }, [currentTimeFrame, searchParams]);
  
  // Handle timeframe selection
  const handleTimeFrameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams);
    
    if (value === 'custom') {
      setShowCustomPicker(true);
      return;
    }
    
    // Update or add the timeframe parameter
    params.set('timeframe', value);
    
    // Remove custom date parameters if they exist
    if (params.has('start')) params.delete('start');
    if (params.has('end')) params.delete('end');
    
    // Update the URL
    router.push(`${pathname}?${params.toString()}`);
    setShowCustomPicker(false);
  };
  
  // Handle custom date range
  const applyCustomDateRange = () => {
    if (!startDate || !endDate) return;
    
    const params = new URLSearchParams(searchParams);
    params.set('timeframe', 'custom');
    params.set('start', startDate);
    params.set('end', endDate);
    
    router.push(`${pathname}?${params.toString()}`);
  };
  
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            id="timeframe-select"
            value={currentTimeFrame}
            onChange={handleTimeFrameChange}
            className="appearance-none block w-44 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md text-sm shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {TIME_FRAMES.map((frame) => (
              <option key={frame.value} value={frame.value}>
                {frame.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Custom date range picker */}
      {showCustomPicker && currentTimeFrame === 'custom' && (
        <div className="absolute z-10 mt-2 right-0 w-auto p-4 border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <div className="flex flex-row items-end gap-3">
            <div>
              <label htmlFor="start-date" className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-sm border rounded-md dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-sm border rounded-md dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <button
              onClick={applyCustomDateRange}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none"
            >
              Apply
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('timeframe', '30d');
                if (params.has('start')) params.delete('start');
                if (params.has('end')) params.delete('end');
                router.push(`${pathname}?${params.toString()}`);
                setShowCustomPicker(false);
              }}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}