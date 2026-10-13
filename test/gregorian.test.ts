import { describe, expect, it } from 'vitest';
import {
  dayNumberToGregorian,
  daysInGregorianMonth,
  gregorianToDayNumber,
  isGregorianLeapYear,
  isValidGregorianDate,
  weekdayOf,
} from '../src/core/gregorian.js';

describe('Gregorian day numbers', () => {
  it('matches known Rata Die values', () => {
    expect(gregorianToDayNumber(1, 1, 1)).toBe(1);
    expect(gregorianToDayNumber(1970, 1, 1)).toBe(719163);
    expect(gregorianToDayNumber(2000, 1, 1)).toBe(730120);
  });

  it('agrees with Date.UTC over four centuries', () => {
    const epoch = gregorianToDayNumber(1970, 1, 1);
    for (let year = 1800; year <= 2200; year += 7) {
      for (let month = 1; month <= 12; month++) {
        const day = Math.min(28, month * 2);
        const expected = epoch + Date.UTC(year, month - 1, day) / 86_400_000;
        expect(gregorianToDayNumber(year, month, day)).toBe(expected);
      }
    }
  });

  it('round-trips every day from 1900 to 2100', () => {
    const first = gregorianToDayNumber(1900, 1, 1);
    const last = gregorianToDayNumber(2100, 12, 31);
    for (let n = first; n <= last; n++) {
      const { year, month, day } = dayNumberToGregorian(n);
      expect(gregorianToDayNumber(year, month, day)).toBe(n);
    }
  });

  it('handles the last day of leap and century years', () => {
    expect(dayNumberToGregorian(gregorianToDayNumber(2000, 12, 31))).toEqual({
      year: 2000,
      month: 12,
      day: 31,
    });
    expect(dayNumberToGregorian(gregorianToDayNumber(2024, 12, 31))).toEqual({
      year: 2024,
      month: 12,
      day: 31,
    });
  });
});

describe('Gregorian helpers', () => {
  it('knows leap years', () => {
    expect([1900, 2000, 2023, 2024].map(isGregorianLeapYear)).toEqual([
      false,
      true,
      false,
      true,
    ]);
    expect(daysInGregorianMonth(2024, 2)).toBe(29);
    expect(daysInGregorianMonth(2023, 2)).toBe(28);
  });

  it('validates dates', () => {
    expect(isValidGregorianDate(2024, 2, 29)).toBe(true);
    expect(isValidGregorianDate(2023, 2, 29)).toBe(false);
    expect(isValidGregorianDate(2024, 13, 1)).toBe(false);
    expect(isValidGregorianDate(2024, 1, 1.5)).toBe(false);
  });

  it('gives Sunday as 0', () => {
    expect(weekdayOf(gregorianToDayNumber(2026, 10, 11))).toBe(0); // Sunday
    expect(weekdayOf(gregorianToDayNumber(2026, 10, 13))).toBe(2); // Tuesday
  });
});
