// Date and Time Utilities
import { format, parseISO, isValid, differenceInDays, differenceInHours, differenceInMinutes, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Format date to various formats
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatStr);
}

// Format time
export function formatTime(time, format12Hour = true) {
  if (!time) return '';
  const formatStr = format12Hour ? 'h:mm a' : 'HH:mm';

  // If time is a full date string
  if (time.includes('T') || time.includes(' ')) {
    const dateObj = parseISO(time);
    return format(dateObj, formatStr);
  }

  // If time is just HH:mm format
  return time;
}

// Format datetime
export function formatDateTime(datetime, formatStr = 'MMM d, yyyy h:mm a') {
  if (!datetime) return '';
  const dateObj = typeof datetime === 'string' ? parseISO(datetime) : datetime;
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatStr);
}

// Get relative time (e.g., "2 hours ago", "in 3 days")
export function getRelativeTime(date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';

  const now = new Date();
  const diffMinutes = differenceInMinutes(now, dateObj);
  const diffHours = differenceInHours(now, dateObj);
  const diffDays = differenceInDays(now, dateObj);

  // Future dates
  if (diffMinutes < 0) {
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffMinutes < 60) return `in ${absDiffMinutes} minute${absDiffMinutes !== 1 ? 's' : ''}`;
    if (absDiffHours < 24) return `in ${absDiffHours} hour${absDiffHours !== 1 ? 's' : ''}`;
    if (absDiffDays < 7) return `in ${absDiffDays} day${absDiffDays !== 1 ? 's' : ''}`;
    if (absDiffDays < 30) return `in ${Math.floor(absDiffDays / 7)} week${Math.floor(absDiffDays / 7) !== 1 ? 's' : ''}`;
    return formatDate(dateObj);
  }

  // Past dates
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
}

// Check if date is today
export function isToday(date) {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  return formatDate(dateObj, 'yyyy-MM-dd') === formatDate(today, 'yyyy-MM-dd');
}

// Check if date is in the past
export function isPast(date) {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < new Date();
}

// Check if date is in the future
export function isFuture(date) {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > new Date();
}

// Get date range for common periods
export function getDateRange(period) {
  const now = new Date();

  switch (period) {
    case 'today':
      return {
        start: format(now, 'yyyy-MM-dd'),
        end: format(now, 'yyyy-MM-dd'),
      };

    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        start: format(yesterday, 'yyyy-MM-dd'),
        end: format(yesterday, 'yyyy-MM-dd'),
      };

    case 'this_week':
      return {
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };

    case 'last_week':
      const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      return {
        start: format(lastWeekStart, 'yyyy-MM-dd'),
        end: format(lastWeekEnd, 'yyyy-MM-dd'),
      };

    case 'this_month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };

    case 'last_month':
      const lastMonth = subDays(startOfMonth(now), 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };

    case 'last_7_days':
      return {
        start: format(subDays(now, 7), 'yyyy-MM-dd'),
        end: format(now, 'yyyy-MM-dd'),
      };

    case 'last_30_days':
      return {
        start: format(subDays(now, 30), 'yyyy-MM-dd'),
        end: format(now, 'yyyy-MM-dd'),
      };

    case 'last_90_days':
      return {
        start: format(subDays(now, 90), 'yyyy-MM-dd'),
        end: format(now, 'yyyy-MM-dd'),
      };

    default:
      return {
        start: format(now, 'yyyy-MM-dd'),
        end: format(now, 'yyyy-MM-dd'),
      };
  }
}

// Get day name from day number (0-6)
export function getDayName(dayNumber, short = false) {
  const days = short
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || '';
}

// Get month name from month number (0-11)
export function getMonthName(monthNumber, short = false) {
  const months = short
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthNumber] || '';
}

// Calculate duration between two times
export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '';

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const durationMinutes = endMinutes - startMinutes;

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

// Format duration in minutes to readable format
export function formatDuration(minutes) {
  if (!minutes) return '0min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

// Get time slots for a day (e.g., for booking system)
export function getTimeSlots(startHour = 6, endHour = 22, intervalMinutes = 30) {
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push({
        value: timeStr,
        label: formatTime(timeStr),
      });
    }
  }

  return slots;
}

// Check if time is within business hours
export function isWithinBusinessHours(time, businessHours = { start: '06:00', end: '22:00' }) {
  if (!time) return false;
  return time >= businessHours.start && time <= businessHours.end;
}

// Get age from date of birth
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

// Format date for input fields
export function formatDateForInput(date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'yyyy-MM-dd');
}

// Format time for input fields
export function formatTimeForInput(time) {
  if (!time) return '';
  // If it's already in HH:mm format, return as is
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  // Otherwise try to parse and format
  const dateObj = parseISO(time);
  if (!isValid(dateObj)) return '';
  return format(dateObj, 'HH:mm');
}

// Usage examples:
/*
import { formatDate, formatTime, getRelativeTime, getDateRange } from './lib/dateUtils';

// Format dates
formatDate('2024-01-15'); // "Jan 15, 2024"
formatDate('2024-01-15', 'MMMM d, yyyy'); // "January 15, 2024"

// Format times
formatTime('14:30'); // "2:30 PM"
formatTime('14:30', false); // "14:30"

// Relative time
getRelativeTime('2024-01-15T10:30:00'); // "2 hours ago"

// Date ranges
const { start, end } = getDateRange('last_7_days');

// Calculate age
calculateAge('1990-05-15'); // 34

// Duration
calculateDuration('09:00', '10:30'); // "1h 30min"
*/
