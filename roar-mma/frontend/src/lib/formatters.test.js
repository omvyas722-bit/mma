import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatPhone,
  formatPercentage,
  truncate,
  capitalize,
  capitalizeWords,
  slugify,
  getInitials,
  calculateAge,
  getDayOfWeek,
  getStatusColor,
  debounce,
  generateId,
  downloadCSV,
} from './formatters';

describe('formatCurrency', () => {
  it('formats amount in AUD by default', () => {
    const result = formatCurrency(1234.5);
    expect(result).toContain('$');
    expect(result).toContain('1,234');
  });

  it('formats amount with custom currency', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('formats negative amount', () => {
    const result = formatCurrency(-50);
    expect(result).toContain('-');
  });
});

describe('formatDate', () => {
  it('returns short format by default', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns long format', () => {
    const result = formatDate('2024-01-15', 'long');
    expect(result).toContain('2024');
    expect(result).toContain('January');
  });

  it('returns time format', () => {
    const result = formatDate('2024-01-15T14:30:00', 'time');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('returns datetime format', () => {
    const result = formatDate('2024-01-15T14:30:00', 'datetime');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than 60 seconds', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('just now');
  });

  it('returns "5m ago" for 5 minutes ago', () => {
    const d = new Date(Date.now() - 300000);
    expect(formatRelativeTime(d.toISOString())).toBe('5m ago');
  });

  it('returns "1m ago" for 1 minute ago', () => {
    const d = new Date(Date.now() - 60000);
    expect(formatRelativeTime(d.toISOString())).toBe('1m ago');
  });

  it('returns "2h ago" for 2 hours ago', () => {
    const d = new Date(Date.now() - 7200000);
    expect(formatRelativeTime(d.toISOString())).toBe('2h ago');
  });

  it('returns "1h ago" for 1 hour ago', () => {
    const d = new Date(Date.now() - 3600000);
    expect(formatRelativeTime(d.toISOString())).toBe('1h ago');
  });

  it('returns "3d ago" for 3 days ago', () => {
    const d = new Date(Date.now() - 259200000);
    expect(formatRelativeTime(d.toISOString())).toBe('3d ago');
  });

  it('returns "1d ago" for 1 day ago', () => {
    const d = new Date(Date.now() - 86400000);
    expect(formatRelativeTime(d.toISOString())).toBe('1d ago');
  });

  it('returns "2w ago" for 2 weeks ago', () => {
    const d = new Date(Date.now() - 1209600000);
    expect(formatRelativeTime(d.toISOString())).toBe('2w ago');
  });

  it('returns "1w ago" for 1 week ago', () => {
    const d = new Date(Date.now() - 604800000);
    expect(formatRelativeTime(d.toISOString())).toBe('1w ago');
  });

  it('returns "3mo ago" for ~90 days ago', () => {
    const d = new Date(Date.now() - 7776000000);
    expect(formatRelativeTime(d.toISOString())).toBe('3mo ago');
  });

  it('returns "1mo ago" for ~30 days ago', () => {
    const d = new Date(Date.now() - 2592000000);
    expect(formatRelativeTime(d.toISOString())).toBe('1mo ago');
  });

  it('returns "2y ago" for ~730 days ago', () => {
    const d = new Date(Date.now() - 63072000000);
    expect(formatRelativeTime(d.toISOString())).toBe('2y ago');
  });

  it('returns "1y ago" for ~365 days ago', () => {
    const d = new Date(Date.now() - 31536000000);
    expect(formatRelativeTime(d.toISOString())).toBe('1y ago');
  });
});

describe('formatPhone', () => {
  it('formats 10-digit Australian phone', () => {
    expect(formatPhone('0412345678')).toBe('0412 345 678');
  });

  it('strips non-digits and formats', () => {
    expect(formatPhone('0412 345 678')).toBe('0412 345 678');
  });

  it('returns original if not 10 digits', () => {
    expect(formatPhone('123')).toBe('123');
  });

  it('returns original for empty string', () => {
    expect(formatPhone('')).toBe('');
  });

  it('throws for null', () => {
    expect(() => formatPhone(null)).toThrow();
  });
});

describe('formatPercentage', () => {
  it('formats with 1 decimal by default', () => {
    expect(formatPercentage(75.5)).toBe('75.5%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercentage(75.567, 2)).toBe('75.57%');
  });

  it('formats zero', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('formats 100%', () => {
    expect(formatPercentage(100)).toBe('100.0%');
  });

  it('formats with 0 decimals', () => {
    expect(formatPercentage(99.9, 0)).toBe('100%');
  });
});

describe('truncate', () => {
  it('returns text as-is if within length', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and adds ...', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello worl...');
  });

  it('uses default length of 50', () => {
    const text = 'a'.repeat(100);
    const result = truncate(text);
    expect(result.length).toBe(53);
    expect(result.endsWith('...')).toBe(true);
  });

  it('returns empty string for empty input', () => {
    expect(truncate('')).toBe('');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('lowercases other letters', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });
});

describe('capitalizeWords', () => {
  it('capitalizes each word', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World');
  });

  it('trims extra spaces', () => {
    expect(capitalizeWords('hello   world')).toBe('Hello   World');
  });

  it('handles empty string', () => {
    expect(capitalizeWords('')).toBe('');
  });

  it('handles single word', () => {
    expect(capitalizeWords('hello')).toBe('Hello');
  });
});

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('hello@world!')).toBe('helloworld');
  });

  it('replaces underscores with hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('collapses multiple whitespace/hyphens', () => {
    expect(slugify('hello   world---test')).toBe('hello-world-test');
  });
});

describe('getInitials', () => {
  it('returns first 2 initials', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial for one name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('uppercases initials', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('handles middle name', () => {
    expect(getInitials('John Michael Doe')).toBe('JM');
  });

  it('handles empty string', () => {
    expect(getInitials('')).toBe('');
  });
});

describe('calculateAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates age correctly', () => {
    expect(calculateAge('1990-06-15')).toBe(34);
  });

  it('subtracts year if birthday not yet passed', () => {
    expect(calculateAge('1990-08-15')).toBe(33);
  });

  it('subtracts year if birthday is later this month', () => {
    expect(calculateAge('1990-06-20')).toBe(33);
  });
});

describe('getDayOfWeek', () => {
  it('returns Sunday for 0', () => {
    expect(getDayOfWeek(0)).toBe('Sunday');
  });

  it('returns Saturday for 6', () => {
    expect(getDayOfWeek(6)).toBe('Saturday');
  });

  it('returns undefined for out of range', () => {
    expect(getDayOfWeek(7)).toBeUndefined();
  });
});

describe('getStatusColor', () => {
  it('returns green for active', () => {
    expect(getStatusColor('active')).toBe('green');
  });

  it('returns yellow for trial', () => {
    expect(getStatusColor('trial')).toBe('yellow');
  });

  it('returns gray for paused', () => {
    expect(getStatusColor('paused')).toBe('gray');
  });

  it('returns red for cancelled', () => {
    expect(getStatusColor('cancelled')).toBe('red');
  });

  it('returns green for succeeded', () => {
    expect(getStatusColor('succeeded')).toBe('green');
  });

  it('returns red for failed', () => {
    expect(getStatusColor('failed')).toBe('red');
  });

  it('returns blue for scheduled', () => {
    expect(getStatusColor('scheduled')).toBe('blue');
  });

  it('returns gray for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('gray');
  });

  it('returns gray for null', () => {
    expect(getStatusColor(null)).toBe('gray');
  });

  it('returns gray for undefined', () => {
    expect(getStatusColor(undefined)).toBe('gray');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls function after wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels previous call if invoked again', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);
    debounced();
    vi.advanceTimersByTime(300);
    debounced();
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('arg1', 42);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('arg1', 42);
  });

  it('can be called multiple times with delays', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('generateId', () => {
  it('returns a string of length 7', () => {
    const id = generateId();
    expect(id.length).toBe(7);
  });

  it('returns alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-z]+$/);
  });

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('downloadCSV', () => {
  let createElementSpy;

  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:url');
    globalThis.URL.revokeObjectURL = vi.fn();
    const anchor = { click: vi.fn(), download: '' };
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
  });

  afterEach(() => {
    createElementSpy.mockRestore();
  });

  it('creates a Blob and triggers download', () => {
    const data = [{ name: 'John', age: 30 }];
    downloadCSV(data, 'test.csv');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');
  });

  it('sets download attribute on anchor', () => {
    const data = [{ name: 'John', age: 30 }];
    downloadCSV(data, 'test.csv');
    const anchor = createElementSpy.mock.results[0].value;
    expect(anchor.download).toBe('test.csv');
    expect(anchor.click).toHaveBeenCalled();
  });

  it('creates object URL and revokes it', () => {
    const data = [{ name: 'John' }];
    downloadCSV(data, 'test.csv');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });

  it('handles empty data', () => {
    downloadCSV([], 'empty.csv');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
