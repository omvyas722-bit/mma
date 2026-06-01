import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatTime,
  formatDateTime,
  getRelativeTime,
  isToday,
  isPast,
  isFuture,
  getDateRange,
  getDayName,
  getMonthName,
  calculateDuration,
  formatDuration,
  getTimeSlots,
  isWithinBusinessHours,
  calculateAge,
  formatDateForInput,
  formatTimeForInput,
} from './dateUtils';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDate', () => {
  it('returns formatted date string with default format', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
  });

  it('returns formatted date with custom format', () => {
    expect(formatDate('2024-01-15', 'yyyy-MM-dd')).toBe('2024-01-15');
  });

  it('accepts Date object', () => {
    expect(formatDate(new Date(2024, 0, 15))).toBe('Jan 15, 2024');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('formatTime', () => {
  it('returns HH:mm as-is', () => {
    expect(formatTime('14:30')).toBe('14:30');
  });

  it('formats full datetime string with default 12-hour', () => {
    const result = formatTime('2024-01-15T14:30:00');
    expect(result).toContain(':30');
    expect(result).toMatch(/2:30\s*(PM|pm)/i);
  });

  it('formats full datetime string with 24-hour', () => {
    const result = formatTime('2024-01-15T14:30:00', false);
    expect(result).toBe('14:30');
  });

  it('formats datetime string containing space', () => {
    const result = formatTime('2024-01-15 14:30:00');
    expect(result).toMatch(/2:30\s*(PM|pm)/i);
  });

  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTime(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatTime('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('returns formatted datetime with default format', () => {
    const result = formatDateTime('2024-01-15T14:30:00');
    expect(result).toContain('Jan 15, 2024');
    expect(result).toMatch(/2:30\s*(PM|pm)/i);
  });

  it('accepts Date object', () => {
    const result = formatDateTime(new Date(2024, 0, 15, 14, 30));
    expect(result).toContain('Jan 15, 2024');
  });

  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDateTime('bad')).toBe('');
  });
});

describe('getRelativeTime', () => {
  it('returns "just now" for less than a minute ago', () => {
    expect(getRelativeTime(new Date())).toBe('just now');
  });

  it('returns "1 minute ago" for 1 minute ago', () => {
    const d = new Date(Date.now() - 60000);
    expect(getRelativeTime(d)).toBe('1 minute ago');
  });

  it('returns "5 minutes ago" for 5 minutes ago', () => {
    const d = new Date(Date.now() - 300000);
    expect(getRelativeTime(d)).toBe('5 minutes ago');
  });

  it('returns "1 hour ago" for 1 hour ago', () => {
    const d = new Date(Date.now() - 3600000);
    expect(getRelativeTime(d)).toBe('1 hour ago');
  });

  it('returns "3 hours ago" for 3 hours ago', () => {
    const d = new Date(Date.now() - 10800000);
    expect(getRelativeTime(d)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for 1 day ago', () => {
    const d = new Date(Date.now() - 86400000);
    expect(getRelativeTime(d)).toBe('1 day ago');
  });

  it('returns "7 days ago" for 6 days ago', () => {
    const d = new Date(Date.now() - 518400000);
    expect(getRelativeTime(d)).toBe('6 days ago');
  });

  it('returns "1 week ago" for 7+ days', () => {
    const d = new Date(Date.now() - 604800000 * 1.5);
    expect(getRelativeTime(d)).toBe('1 week ago');
  });

  it('returns "3 weeks ago" for 3 weeks', () => {
    const d = new Date(Date.now() - 604800000 * 3);
    expect(getRelativeTime(d)).toBe('3 weeks ago');
  });

  it('returns "1 month ago" for ~30 days', () => {
    const d = new Date(Date.now() - 2592000000);
    expect(getRelativeTime(d)).toBe('1 month ago');
  });

  it('returns "2 months ago" for ~60 days', () => {
    const d = new Date(Date.now() - 5184000000);
    expect(getRelativeTime(d)).toBe('2 months ago');
  });

  it('returns "1 year ago" for ~365 days', () => {
    const d = new Date(Date.now() - 31536000000);
    expect(getRelativeTime(d)).toBe('1 year ago');
  });

  it('returns "2 years ago" for ~730 days', () => {
    const d = new Date(Date.now() - 63072000000);
    expect(getRelativeTime(d)).toBe('2 years ago');
  });

  it('handles future date with "in X minutes"', () => {
    const d = new Date(Date.now() + 300000);
    expect(getRelativeTime(d)).toBe('in 5 minutes');
  });

  it('handles future date with "in X hours"', () => {
    const d = new Date(Date.now() + 7200000);
    expect(getRelativeTime(d)).toBe('in 2 hours');
  });

  it('handles future date with "in X days"', () => {
    const d = new Date(Date.now() + 172800000);
    expect(getRelativeTime(d)).toBe('in 2 days');
  });

  it('handles future date with "in X weeks"', () => {
    const d = new Date(Date.now() + 1209600000);
    expect(getRelativeTime(d)).toBe('in 2 weeks');
  });

  it('formats future date beyond weeks as formatted date', () => {
    const result = getRelativeTime('2025-06-15');
    expect(result).toContain('2025');
  });

  it('returns empty string for null', () => {
    expect(getRelativeTime(null)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(getRelativeTime('bad')).toBe('');
  });

  it('returns singular "1 week ago" at exactly 7 days', () => {
    const d = new Date(Date.now() - 604800000);
    expect(getRelativeTime(d)).toBe('1 week ago');
  });
});

describe('isToday', () => {
  it('returns true for current date', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('returns false for yesterday', () => {
    const d = new Date(Date.now() - 86400000);
    expect(isToday(d)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const d = new Date(Date.now() + 86400000);
    expect(isToday(d)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isToday(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isToday(undefined)).toBe(false);
  });
});

describe('isPast', () => {
  it('returns true for past date', () => {
    expect(isPast('2023-01-01')).toBe(true);
  });

  it('returns false for future date', () => {
    expect(isPast('2025-01-01')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPast(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPast(undefined)).toBe(false);
  });
});

describe('isFuture', () => {
  it('returns true for future date', () => {
    expect(isFuture('2025-01-01')).toBe(true);
  });

  it('returns false for past date', () => {
    expect(isFuture('2023-01-01')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isFuture(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isFuture(undefined)).toBe(false);
  });
});

describe('getDateRange', () => {
  it('returns today range', () => {
    const { start, end } = getDateRange('today');
    expect(start).toBe('2024-06-15');
    expect(end).toBe('2024-06-15');
  });

  it('returns yesterday range', () => {
    const { start, end } = getDateRange('yesterday');
    expect(start).toBe('2024-06-14');
    expect(end).toBe('2024-06-14');
  });

  it('returns this_week range', () => {
    const { start } = getDateRange('this_week');
    expect(start).toBe('2024-06-10');
  });

  it('returns last_week range', () => {
    const { start, end } = getDateRange('last_week');
    expect(start).toBe('2024-06-03');
    expect(end).toBe('2024-06-09');
  });

  it('returns this_month range', () => {
    const { start, end } = getDateRange('this_month');
    expect(start).toBe('2024-06-01');
    expect(end).toBe('2024-06-30');
  });

  it('returns last_month range', () => {
    const { start, end } = getDateRange('last_month');
    expect(start).toBe('2024-05-01');
    expect(end).toBe('2024-05-31');
  });

  it('returns last_7_days range', () => {
    const { start, end } = getDateRange('last_7_days');
    expect(start).toBe('2024-06-08');
    expect(end).toBe('2024-06-15');
  });

  it('returns last_30_days range', () => {
    const { start, end } = getDateRange('last_30_days');
    expect(start).toBe('2024-05-16');
    expect(end).toBe('2024-06-15');
  });

  it('returns last_90_days range', () => {
    const { start, end } = getDateRange('last_90_days');
    expect(start).toBe('2024-03-17');
    expect(end).toBe('2024-06-15');
  });

  it('defaults to today for unknown period', () => {
    const { start, end } = getDateRange('unknown');
    expect(start).toBe('2024-06-15');
    expect(end).toBe('2024-06-15');
  });

  it('defaults to today for null', () => {
    const { start, end } = getDateRange(null);
    expect(start).toBe('2024-06-15');
    expect(end).toBe('2024-06-15');
  });

  it('defaults to today for undefined', () => {
    const { start, end } = getDateRange(undefined);
    expect(start).toBe('2024-06-15');
    expect(end).toBe('2024-06-15');
  });
});

describe('getDayName', () => {
  it('returns full day name for index 0', () => {
    expect(getDayName(0)).toBe('Sunday');
  });

  it('returns full day name for index 6', () => {
    expect(getDayName(6)).toBe('Saturday');
  });

  it('returns short day name', () => {
    expect(getDayName(1, true)).toBe('Mon');
  });

  it('returns empty string for out of range', () => {
    expect(getDayName(7)).toBe('');
  });

  it('returns empty string for negative index', () => {
    expect(getDayName(-1)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(getDayName(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(getDayName(undefined)).toBe('');
  });
});

describe('getMonthName', () => {
  it('returns full month name for index 0', () => {
    expect(getMonthName(0)).toBe('January');
  });

  it('returns full month name for index 11', () => {
    expect(getMonthName(11)).toBe('December');
  });

  it('returns short month name', () => {
    expect(getMonthName(1, true)).toBe('Feb');
  });

  it('returns empty string for out of range', () => {
    expect(getMonthName(12)).toBe('');
  });

  it('returns empty string for negative index', () => {
    expect(getMonthName(-1)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(getMonthName(null)).toBe('');
  });
});

describe('calculateDuration', () => {
  it('returns "1h" for exactly 60 minutes', () => {
    expect(calculateDuration('09:00', '10:00')).toBe('1h');
  });

  it('returns "30min" for 30 minutes', () => {
    expect(calculateDuration('09:00', '09:30')).toBe('30min');
  });

  it('returns "1h 30min" for 90 minutes', () => {
    expect(calculateDuration('09:00', '10:30')).toBe('1h 30min');
  });

  it('returns "0min" for same time', () => {
    expect(calculateDuration('09:00', '09:00')).toBe('0min');
  });

  it('returns "2h" for 120 minutes', () => {
    expect(calculateDuration('08:00', '10:00')).toBe('2h');
  });

  it('returns empty string for null startTime', () => {
    expect(calculateDuration(null, '10:00')).toBe('');
  });

  it('returns empty string for null endTime', () => {
    expect(calculateDuration('09:00', null)).toBe('');
  });

  it('returns empty string for undefined startTime', () => {
    expect(calculateDuration(undefined, '10:00')).toBe('');
  });

  it('returns empty string for empty strings', () => {
    expect(calculateDuration('', '')).toBe('');
  });

  it('handles times crossing noon boundary', () => {
    expect(calculateDuration('23:00', '01:00')).toBe('-22h');
  });
});

describe('formatDuration', () => {
  it('returns "0min" for 0', () => {
    expect(formatDuration(0)).toBe('0min');
  });

  it('returns "0min" for null', () => {
    expect(formatDuration(null)).toBe('0min');
  });

  it('returns "0min" for undefined', () => {
    expect(formatDuration(undefined)).toBe('0min');
  });

  it('returns "45min" for 45', () => {
    expect(formatDuration(45)).toBe('45min');
  });

  it('returns "1h" for 60', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('returns "2h" for 120', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('returns "1h 30min" for 90', () => {
    expect(formatDuration(90)).toBe('1h 30min');
  });

  it('returns "2h 15min" for 135', () => {
    expect(formatDuration(135)).toBe('2h 15min');
  });

  it('returns "0min" for false', () => {
    expect(formatDuration(false)).toBe('0min');
  });
});

describe('getTimeSlots', () => {
  it('returns default slots from 06:00 to 22:00 at 30min intervals', () => {
    const slots = getTimeSlots();
    expect(slots.length).toBe(32);
    expect(slots[0]).toEqual({ value: '06:00', label: '06:00' });
    expect(slots[slots.length - 1]).toEqual({ value: '21:30', label: '21:30' });
  });

  it('respects custom startHour and endHour', () => {
    const slots = getTimeSlots(8, 10, 60);
    expect(slots.length).toBe(2);
    expect(slots[0].value).toBe('08:00');
    expect(slots[1].value).toBe('09:00');
  });

  it('respects custom interval', () => {
    const slots = getTimeSlots(6, 8, 15);
    expect(slots.length).toBe(8);
  });

  it('returns empty array when start >= end', () => {
    const slots = getTimeSlots(10, 10);
    expect(slots.length).toBe(0);
  });
});

describe('isWithinBusinessHours', () => {
  it('returns true for time within default hours', () => {
    expect(isWithinBusinessHours('12:00')).toBe(true);
  });

  it('returns true for start boundary', () => {
    expect(isWithinBusinessHours('06:00')).toBe(true);
  });

  it('returns true for end boundary', () => {
    expect(isWithinBusinessHours('22:00')).toBe(true);
  });

  it('returns false for time before start', () => {
    expect(isWithinBusinessHours('05:00')).toBe(false);
  });

  it('returns false for time after end', () => {
    expect(isWithinBusinessHours('23:00')).toBe(false);
  });

  it('respects custom business hours', () => {
    const hours = { start: '09:00', end: '17:00' };
    expect(isWithinBusinessHours('12:00', hours)).toBe(true);
    expect(isWithinBusinessHours('08:00', hours)).toBe(false);
    expect(isWithinBusinessHours('17:30', hours)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isWithinBusinessHours(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isWithinBusinessHours(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isWithinBusinessHours('')).toBe(false);
  });
});

describe('calculateAge', () => {
  it('calculates age correctly for same month', () => {
    expect(calculateAge('1990-06-15')).toBe(34);
  });

  it('calculates age before birthday in current year', () => {
    expect(calculateAge('1990-08-15')).toBe(33);
  });

  it('calculates age after birthday in current year', () => {
    expect(calculateAge('1990-03-15')).toBe(34);
  });

  it('calculates age for future birthday month but not day', () => {
    expect(calculateAge('1990-06-20')).toBe(33);
  });

  it('returns null for null', () => {
    expect(calculateAge(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(calculateAge(undefined)).toBeNull();
  });

  it('handles string date input', () => {
    expect(calculateAge('1990-06-15')).toBe(34);
  });
});

describe('formatDateForInput', () => {
  it('formats date to yyyy-MM-dd', () => {
    expect(formatDateForInput('2024-01-15')).toBe('2024-01-15');
  });

  it('accepts Date object', () => {
    expect(formatDateForInput(new Date(2024, 0, 15))).toBe('2024-01-15');
  });

  it('returns empty string for null', () => {
    expect(formatDateForInput(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateForInput(undefined)).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDateForInput('bad')).toBe('');
  });
});

describe('formatTimeForInput', () => {
  it('returns HH:mm as-is', () => {
    expect(formatTimeForInput('14:30')).toBe('14:30');
  });

  it('parses full datetime to HH:mm', () => {
    expect(formatTimeForInput('2024-01-15T14:30:00')).toBe('14:30');
  });

  it('returns empty string for null', () => {
    expect(formatTimeForInput(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTimeForInput(undefined)).toBe('');
  });

  it('returns empty string for invalid time string', () => {
    expect(formatTimeForInput('bad')).toBe('');
  });
});
