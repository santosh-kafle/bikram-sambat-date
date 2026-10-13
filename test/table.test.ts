import { describe, expect, it } from 'vitest';
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  bsToDayNumber,
  dayNumberToBs,
  daysInBsMonth,
  daysInBsYear,
  isValidBsDate,
  tableDayNumberRange,
} from '../src/core/table.js';
import { DateOutOfRangeError, InvalidDateError } from '../src/errors.js';

const years = Array.from(
  { length: BS_MAX_YEAR - BS_MIN_YEAR + 1 },
  (_, i) => BS_MIN_YEAR + i,
);

describe('calendar table', () => {
  it('has 29–32 days in every month and 365 or 366 in every year', () => {
    for (const year of years) {
      for (let month = 1; month <= 12; month++) {
        expect(daysInBsMonth(year, month)).toBeGreaterThanOrEqual(29);
        expect(daysInBsMonth(year, month)).toBeLessThanOrEqual(32);
      }
      expect([365, 366]).toContain(daysInBsYear(year));
    }
  });

  it('round-trips every day it covers', () => {
    const { first, last } = tableDayNumberRange();
    let expected = { year: BS_MIN_YEAR, month: 1, day: 1 };
    for (let n = first; n <= last; n++) {
      const bs = dayNumberToBs(n);
      expect(bs).toEqual(expected);
      expect(bsToDayNumber(bs.year, bs.month, bs.day)).toBe(n);
      // The next day in BS, worked out independently of the table index.
      expected =
        bs.day < daysInBsMonth(bs.year, bs.month)
          ? { ...bs, day: bs.day + 1 }
          : bs.month < 12
            ? { year: bs.year, month: bs.month + 1, day: 1 }
            : { year: bs.year + 1, month: 1, day: 1 };
    }
  });
});

describe('range and validity', () => {
  it('throws DateOutOfRangeError outside the table', () => {
    expect(() => daysInBsMonth(BS_MIN_YEAR - 1, 1)).toThrow(
      DateOutOfRangeError,
    );
    expect(() => bsToDayNumber(BS_MAX_YEAR + 1, 1, 1)).toThrow(
      DateOutOfRangeError,
    );
    const { first, last } = tableDayNumberRange();
    expect(() => dayNumberToBs(first - 1)).toThrow(DateOutOfRangeError);
    expect(() => dayNumberToBs(last + 1)).toThrow(DateOutOfRangeError);
  });

  it('throws InvalidDateError for dates that do not exist', () => {
    // Baisakh 2083 has 31 days.
    expect(() => bsToDayNumber(2083, 1, 32)).toThrow(InvalidDateError);
    expect(() => bsToDayNumber(2083, 13, 1)).toThrow(InvalidDateError);
    expect(() => bsToDayNumber(2083, 1, 0)).toThrow(InvalidDateError);
    expect(() => bsToDayNumber(2083.5, 1, 1)).toThrow(InvalidDateError);
  });

  it('reports validity without throwing', () => {
    expect(isValidBsDate(2083, 1, 31)).toBe(true);
    expect(isValidBsDate(2083, 1, 32)).toBe(false);
    expect(isValidBsDate(2083, 0, 1)).toBe(false);
    expect(isValidBsDate(BS_MAX_YEAR + 1, 1, 1)).toBe(false);
    expect(isValidBsDate(Number.NaN, 1, 1)).toBe(false);
  });
});
