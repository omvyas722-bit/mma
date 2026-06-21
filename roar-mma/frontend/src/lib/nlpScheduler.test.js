import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from './nlpScheduler';

describe('parseNaturalLanguage', () => {
  it('parses class type from input', () => {
    const result = parseNaturalLanguage('bjj class tomorrow');
    expect(result.classType).toBe('bjj');
  });

  it('parses multi-word class type', () => {
    const result = parseNaturalLanguage('muay thai session next monday');
    expect(result.classType).toBe('muay_thai');
  });

  it('parses "tomorrow" as date', () => {
    const result = parseNaturalLanguage('boxing tomorrow');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    expect(result.date).toBe(expected);
  });

  it('parses "today" as date', () => {
    const result = parseNaturalLanguage('mma today');
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(result.date).toBe(expected);
  });

  it('parses day of week', () => {
    const result = parseNaturalLanguage('wrestling on wednesday');
    expect(result.dayOfWeek).toBe(3);
  });

  it('parses 12-hour time with AM/PM', () => {
    const result = parseNaturalLanguage('fitness class at 2:30 pm');
    expect(result.time).toBe('14:30');
  });

  it('parses 12-hour time without minutes', () => {
    const result = parseNaturalLanguage('yoga at 9 am');
    expect(result.time).toBe('09:00');
  });

  it('parses 24-hour time', () => {
    const result = parseNaturalLanguage('hiit at 14:00');
    expect(result.time).toBe('14:00');
  });

  it('parses location alias "rockingham"', () => {
    const result = parseNaturalLanguage('bjj at rockingham');
    expect(result.location).toBe('rockingham');
  });

  it('parses location alias "bibra"', () => {
    const result = parseNaturalLanguage('muay thai at bibra');
    expect(result.location).toBe('bibra_lake');
  });

  it('parses location alias "24/7"', () => {
    const result = parseNaturalLanguage('boxing at 24/7 gym');
    expect(result.location).toBe('247_gym');
  });

  it('detects recurring events', () => {
    const result = parseNaturalLanguage('every monday bjj class');
    expect(result.recurring).toBe(true);
  });

  it('detects "weekly" as recurring', () => {
    const result = parseNaturalLanguage('weekly fitness class');
    expect(result.recurring).toBe(true);
  });

  it('non-recurring input returns false', () => {
    const result = parseNaturalLanguage('bjj class tomorrow');
    expect(result.recurring).toBe(false);
  });

  it('generates readable name from class type', () => {
    const result = parseNaturalLanguage('muay thai tomorrow');
    expect(result.name).toBe('Muay Thai');
  });

  it('parses "next monday" date', () => {
    const today = new Date();
    const currentDay = today.getDay();
    let targetDay = 1;
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const expected = new Date(today);
    expected.setDate(today.getDate() + diff);
    const result = parseNaturalLanguage('bjj next monday');
    const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
    expect(result.date).toBe(expectedStr);
  });

  it('parses "this friday" date', () => {
    const today = new Date();
    const currentDay = today.getDay();
    let diff = 5 - currentDay;
    if (diff < 0) diff += 7;
    const expected = new Date(today);
    expected.setDate(today.getDate() + diff);
    const result = parseNaturalLanguage('boxing this friday');
    const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
    expect(result.date).toBe(expectedStr);
  });

  it('parses "next week" date', () => {
    const result = parseNaturalLanguage('bjj next week');
    expect(result.date).toBeTruthy();
  });

  it('parses month + day format', () => {
    const result = parseNaturalLanguage('bjj on january 15');
    expect(result.date).toBeTruthy();
    expect(result.date).toContain('-01-15');
  });

  it('returns null fields for empty input', () => {
    const result = parseNaturalLanguage('');
    expect(result.classType).toBeNull();
    expect(result.dayOfWeek).toBeNull();
    expect(result.time).toBeNull();
    expect(result.location).toBeNull();
    expect(result.date).toBeNull();
    expect(result.recurring).toBe(false);
    expect(result.name).toBeNull();
  });

  it('parses 12:00 AM as 00:00', () => {
    const result = parseNaturalLanguage('class at 12:00 am');
    expect(result.time).toBe('00:00');
  });

  it('parses 12:00 PM as 12:00', () => {
    const result = parseNaturalLanguage('class at 12:00 pm');
    expect(result.time).toBe('12:00');
  });
});
