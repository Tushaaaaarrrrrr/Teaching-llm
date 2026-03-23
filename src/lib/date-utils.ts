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
  manualStatus: string = 'NONE'
) {
  if (manualStatus === 'CANCELLED') return 'cancelled';
  if (manualStatus === 'RESCHEDULED') return 'rescheduled';

  const now = new Date();
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
}
