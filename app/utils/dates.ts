/**
 * Date utilities for time frame calculations
 */

export type TimeFrameValue = '7d' | '30d' | '90d' | '6m' | '12m' | 'ytd' | 'all' | 'custom';

export function getDateRangeFromTimeFrame(timeFrame: string, startDate?: string, endDate?: string): {
  startDate: Date;
  endDate: Date;
  formattedStartDate: string;
  formattedEndDate: string;
} {
  const today = new Date();
  let startDateObj = new Date(today);
  
  // Custom date range
  if (timeFrame === 'custom' && startDate && endDate) {
    startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    return {
      startDate: startDateObj,
      endDate: endDateObj,
      formattedStartDate: formatDateForSql(startDateObj),
      formattedEndDate: formatDateForSql(endDateObj),
    };
  }

  // Calculate start date based on time frame
  switch (timeFrame) {
    case '7d':
      startDateObj.setDate(today.getDate() - 7);
      break;
    case '30d':
      startDateObj.setDate(today.getDate() - 30);
      break;
    case '90d':
      startDateObj.setDate(today.getDate() - 90);
      break;
    case '6m':
      startDateObj.setMonth(today.getMonth() - 6);
      break;
    case '12m':
      startDateObj.setMonth(today.getMonth() - 12);
      break;
    case 'ytd':
      startDateObj = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
      break;
    case 'all':
      startDateObj = new Date(2000, 0, 1); // Use a far past date for "all time"
      break;
    default:
      // Default to 30 days if invalid timeframe
      startDateObj.setDate(today.getDate() - 30);
  }

  return {
    startDate: startDateObj,
    endDate: today,
    formattedStartDate: formatDateForSql(startDateObj),
    formattedEndDate: formatDateForSql(today),
  };
}

/**
 * Format a date object as YYYY-MM-DD for SQL queries
 */
export function formatDateForSql(date: Date): string {
  return date.toISOString().split('T')[0];
}