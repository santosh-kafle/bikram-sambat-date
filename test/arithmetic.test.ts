import { describe, expect, it } from 'vitest';
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BsDate,
  DateOutOfRangeError,
  supportedRange,
} from '../src/index.js';

/**
 * A small seeded random generator (mulberry32), so property tests are
 * reproducible without a dependency.
 */
function random(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));
  return { int };
}

const DAY = 86_400_000;
const { published, projected } = supportedRange();
const firstMs = published.bs.min.toInstant().getTime();
const lastMs = projected.bs.max.toInstant().getTime();
const totalDays = Math.round((lastMs - firstMs) / DAY);

/** A random date in the supported range. */
const randomDate = (rng: ReturnType<typeof random>) =>
  published.bs.min.addDays(rng.int(0, totalDays));

const RUNS = 2000;

describe('addDays', () => {
  it('matches Gregorian day arithmetic', () => {
    const rng = random(1);
    for (let i = 0; i < RUNS; i++) {
      const date = randomDate(rng);
      const days = rng.int(-4000, 4000);
      const ad = date.toAd();
      const expectedMs = Date.UTC(ad.year, ad.month - 1, ad.day) + days * DAY;
      let result: BsDate;
      try {
        result = date.addDays(days);
      } catch (error) {
        expect(error).toBeInstanceOf(DateOutOfRangeError);
        continue;
      }
      const back = result.toAd();
      expect(Date.UTC(back.year, back.month - 1, back.day)).toBe(expectedMs);
    }
  });

  it('is undone by its negative, and diffInDays measures it', () => {
    const rng = random(2);
    for (let i = 0; i < RUNS; i++) {
      const date = randomDate(rng);
      const days = rng.int(-500, 500);
      let moved: BsDate;
      try {
        moved = date.addDays(days);
      } catch (error) {
        expect(error).toBeInstanceOf(DateOutOfRangeError);
        continue;
      }
      expect(moved.addDays(-days).equals(date)).toBe(true);
      expect(moved.diffInDays(date)).toBe(days);
      // 0 - days, not -days, so that 0 is never compared with -0.
      expect(date.diffInDays(moved)).toBe(0 - days);
    }
  });

  it('crosses month and year ends', () => {
    expect(BsDate.of(2083, 3, 32).addDays(1).toString()).toBe('2083-04-01');
    expect(BsDate.of(2082, 12, 30).addDays(1).toString()).toBe('2083-01-01');
    expect(BsDate.of(2083, 1, 1).addDays(-1).toString()).toBe('2082-12-30');
  });
});

describe('addMonths and addYears', () => {
  it('keeps the day, or clamps it to the end of a shorter month', () => {
    // Asar 2083 has 32 days, Shrawan 31.
    expect(BsDate.of(2083, 3, 32).addMonths(1).toString()).toBe('2083-04-31');
    expect(BsDate.of(2083, 3, 15).addMonths(1).toString()).toBe('2083-04-15');
    expect(BsDate.of(2083, 12, 15).addMonths(1).toString()).toBe('2084-01-15');
    expect(BsDate.of(2083, 1, 15).addMonths(-1).toString()).toBe('2082-12-15');
    expect(BsDate.of(2083, 1, 1).addYears(-8).toString()).toBe('2075-01-01');
  });

  it('lands in the right month with the right day', () => {
    const rng = random(3);
    for (let i = 0; i < RUNS; i++) {
      const date = randomDate(rng);
      const months = rng.int(-300, 300);
      const index = date.year * 12 + date.month - 1 + months;
      const year = Math.floor(index / 12);
      if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
        expect(() => date.addMonths(months)).toThrow(DateOutOfRangeError);
        continue;
      }
      const result = date.addMonths(months);
      expect(result.year).toBe(year);
      expect(result.month).toBe(index - year * 12 + 1);
      expect(result.day).toBe(Math.min(date.day, result.daysInMonth));
    }
  });

  it('is measured exactly by diffInMonths', () => {
    const rng = random(4);
    for (let i = 0; i < RUNS; i++) {
      const date = randomDate(rng);
      const months = rng.int(-300, 300);
      let moved: BsDate;
      try {
        moved = date.addMonths(months);
      } catch {
        continue;
      }
      expect(moved.diffInMonths(date), `${date} + ${months}`).toBe(months);
    }
  });

  it('agrees with addYears', () => {
    const rng = random(5);
    for (let i = 0; i < RUNS; i++) {
      const date = randomDate(rng);
      const years = rng.int(-20, 20);
      let byYears: BsDate;
      try {
        byYears = date.addYears(years);
      } catch (error) {
        expect(error).toBeInstanceOf(DateOutOfRangeError);
        continue;
      }
      expect(byYears.equals(date.addMonths(years * 12))).toBe(true);
    }
  });

  it('rejects fractional amounts', () => {
    const date = BsDate.of(2083, 1, 1);
    expect(() => date.addDays(1.5)).toThrow(RangeError);
    expect(() => date.addMonths(Number.NaN)).toThrow(RangeError);
    expect(() => date.addYears(0.5)).toThrow(RangeError);
  });
});

describe('differences', () => {
  it('counts whole months and years, like an age', () => {
    const today = BsDate.of(2083, 6, 27);
    expect(today.diffInYears(BsDate.of(2050, 6, 27))).toBe(33);
    expect(today.diffInYears(BsDate.of(2050, 6, 28))).toBe(32);
    expect(today.diffInMonths(BsDate.of(2083, 5, 27))).toBe(1);
    expect(today.diffInMonths(BsDate.of(2083, 5, 28))).toBe(0);
    expect(BsDate.of(2050, 6, 28).diffInYears(today)).toBe(-32);
  });

  it('counts a month from a clamped end of month', () => {
    // 32 Asar + 1 month = 31 Shrawan, which is one month on.
    expect(BsDate.of(2083, 4, 31).diffInMonths(BsDate.of(2083, 3, 32))).toBe(1);
    expect(BsDate.of(2083, 4, 30).diffInMonths(BsDate.of(2083, 3, 32))).toBe(0);
  });

  it('is antisymmetric and agrees with the day difference in sign', () => {
    const rng = random(6);
    for (let i = 0; i < RUNS; i++) {
      const a = randomDate(rng);
      const b = randomDate(rng);
      expect(a.diffInDays(b)).toBe(0 - b.diffInDays(a));
      const months = a.diffInMonths(b);
      if (months !== 0) {
        expect(Math.sign(months)).toBe(Math.sign(a.diffInDays(b)));
      }
      expect(a.diffInYears(b)).toBe(Math.trunc(months / 12));
    }
  });
});

describe('month and year boundaries', () => {
  it('finds the first and last days', () => {
    const date = BsDate.of(2083, 3, 15);
    expect(date.startOfMonth().toString()).toBe('2083-03-01');
    expect(date.endOfMonth().toString()).toBe('2083-03-32');
    expect(date.startOfYear().toString()).toBe('2083-01-01');
    expect(date.endOfYear().toString()).toBe('2083-12-30');
    expect(date.daysInMonth).toBe(32);
    expect(date.daysInYear).toBe(365);
  });

  it('counts days of the year', () => {
    expect(BsDate.of(2083, 1, 1).dayOfYear).toBe(1);
    expect(BsDate.of(2083, 12, 30).dayOfYear).toBe(365);
    const rng = random(7);
    for (let i = 0; i < RUNS; i++) {
      const date = randomDate(rng);
      expect(
        date
          .startOfYear()
          .addDays(date.dayOfYear - 1)
          .equals(date),
      ).toBe(true);
    }
  });

  it('throws past the supported range', () => {
    expect(() => published.bs.min.addDays(-1)).toThrow(DateOutOfRangeError);
    expect(() => projected.bs.max.addDays(1)).toThrow(DateOutOfRangeError);
    expect(() => BsDate.of(BS_MAX_YEAR, 6, 1).addYears(1)).toThrow(
      DateOutOfRangeError,
    );
  });
});
