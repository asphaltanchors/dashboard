/**
 * Date utilities for time frame calculations
 */

export type TimeFrameValue = 
  | '7d' | '30d' | '90d' | '6m' | '12m' | 'ytd' | 'all' | 'custom'
  | 'last-12-months' | 'last-90-days' | 'last-30-days' | 'last-month' | 'mtd';

export function getDateRangeFromTimeFrame(timeFrame: string, startDate?: string, endDate?: string): {
  startDate: Date;
  endDate: Date;
  formattedStartDate: string;
  formattedEndDate: string;
  displayText: string;
} {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of day today
  let startDateObj = new Date(today);
  let displayText = '';
  
  // Custom date range
  if (timeFrame === 'custom' && startDate && endDate) {
    startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    displayText = `${formatDateForDisplay(startDateObj)} to ${formatDateForDisplay(endDateObj)}`;
    return {
      startDate: startDateObj,
      endDate: endDateObj,
      formattedStartDate: formatDateForSql(startDateObj),
      formattedEndDate: formatDateForSql(endDateObj),
      displayText,
    };
  }

  // Calculate start date based on time frame
  switch (timeFrame) {
    case '7d':
    case 'last-7-days':
      startDateObj.setDate(today.getDate() - 7);
      displayText = 'Last 7 days';
      break;
    case '30d':
    case 'last-30-days':
      startDateObj.setDate(today.getDate() - 30);
      displayText = 'Last 30 days';
      break;
    case '90d':
    case 'last-90-days':
      startDateObj.setDate(today.getDate() - 90);
      displayText = 'Last 90 days';
      break;
    case '6m':
      startDateObj.setMonth(today.getMonth() - 6);
      displayText = 'Last 6 months';
      break;
    case '12m':
    case 'last-12-months':
      startDateObj.setFullYear(today.getFullYear() - 1);
      displayText = 'Last 12 months';
      break;
    case 'ytd':
      startDateObj = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
      displayText = 'Year to date';
      break;
    case 'mtd':
      startDateObj = new Date(today.getFullYear(), today.getMonth(), 1); // First day of current month
      displayText = 'Month to date';
      break;
    case 'last-month':
      // First day of previous month
      startDateObj = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      // Last day of previous month
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      displayText = `${formatDateForDisplay(startDateObj)} to ${formatDateForDisplay(lastDayOfMonth)}`;
      return {
        startDate: startDateObj,
        endDate: lastDayOfMonth,
        formattedStartDate: formatDateForSql(startDateObj),
        formattedEndDate: formatDateForSql(lastDayOfMonth),
        displayText,
      };
    case 'all':
      startDateObj = new Date(2000, 0, 1); // Use a far past date for "all time"
      displayText = 'All time';
      break;
    default:
      // Default to 12 months if invalid timeframe
      startDateObj.setFullYear(today.getFullYear() - 1);
      displayText = 'Last 12 months';
  }

  // Set start date to beginning of day
  startDateObj.setHours(0, 0, 0, 0);

  return {
    startDate: startDateObj,
    endDate: today,
    formattedStartDate: formatDateForSql(startDateObj),
    formattedEndDate: formatDateForSql(today),
    displayText,
  };
}

/**
 * Calculate the date range immediately preceding the given range.
 */
export function getPreviousDateRange(currentStartDate: Date, currentEndDate: Date): {
  startDate: Date;
  endDate: Date;
  formattedStartDate: string;
  formattedEndDate: string;
} {
  const duration = currentEndDate.getTime() - currentStartDate.getTime();
  const endDate = new Date(currentStartDate.getTime() - 1); // Day before current start date
  const startDate = new Date(endDate.getTime() - duration);

  // Adjust to beginning/end of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate,
    endDate,
    formattedStartDate: formatDateForSql(startDate),
    formattedEndDate: formatDateForSql(endDate),
  };
}


/**
 * Format a date object as YYYY-MM-DD for SQL queries
 */
export function formatDateForSql(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a date for display
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}
