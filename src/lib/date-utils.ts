/**
 * Shared utility for Indian Standard Time (IST) formatting and event status.
 * This ensures consistency between the backend and frontend across different
 * server/browser timezones.
 */

export function formatIST(date: string | Date, options: Intl.DateTimeFormatOptions = { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
}) {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-IN', {
      ...options,
      timeZone: 'Asia/Kolkata'
    }).format(d);
  } catch (error) {
    console.error('Error formatting IST date:', error);
    return 'Invalid Date';
  }
}

export function formatISTDate(date: string | Date) {
  return formatIST(date, { month: 'short', day: 'numeric' });
}

export function getEventStatus(
  startTime: string | Date, 
  endTime: string | Date, 
  status: string = 'SCHEDULED'
) {
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'RESCHEDULED') return 'rescheduled';

  const now = new Date();
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
}

/**
 * Returns the exact UTC boundaries corresponding to the start (00:00:00) 
 * and end (23:59:59.999) of the given date (or current date) in IST.
 */
export function getISTDayBoundaries(date?: Date | string) {
  const targetDate = date ? new Date(date) : new Date();
  
  // Format the target date to its corresponding YYYY-MM-DD string in IST timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const formattedDates = formatter.formatToParts(targetDate);
  const year = formattedDates.find(p => p.type === 'year')?.value;
  const month = formattedDates.find(p => p.type === 'month')?.value;
  const day = formattedDates.find(p => p.type === 'day')?.value;
  
  const isoDateString = `${year}-${month}-${day}`;
  
  // Create absolute UTC dates from the IST string representation
  const startOfDay = new Date(`${isoDateString}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${isoDateString}T23:59:59.999+05:30`);
  
  return { startOfDay, endOfDay };
}
