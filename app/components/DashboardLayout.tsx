'use client';

import { ReactNode } from 'react';
import TimeFramePicker from './TimeFramePicker';

type DashboardLayoutProps = {
  children: ReactNode;
  title: string;
  showTimeFramePicker?: boolean;
  dateRangeText?: string;
};

export default function DashboardLayout({
  children,
  title,
  showTimeFramePicker = true,
  dateRangeText
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen p-8 pb-20 gap-8 font-[family-name:var(--font-geist-sans)]">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        {showTimeFramePicker && <TimeFramePicker />}
      </div>
      
      {dateRangeText && (
        <div className="mb-6 text-sm text-gray-500 italic">
          {dateRangeText}
        </div>
      )}
      
      {children}
    </div>
  );
}