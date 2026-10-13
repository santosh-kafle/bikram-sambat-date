import { describe, expect, it } from 'vitest';
import { UNCERTAIN_MONTH_STARTS } from '../src/data/calendar.generated.js';
import {
  adToBs,
  BikramSambatError,
  BS_LAST_PUBLISHED_YEAR,
  BS_MAX_YEAR,
  BsDate,
  bsToAd,
  DateOutOfRangeError,
  daysInBsMonth,
  ProjectedDateError,
} from '../src/index.js';

const firstProjected = BS_LAST_PUBLISHED_YEAR + 1;

describe('projected years', () => {
  it('continue the published table without a gap', () => {
    const lastPublished = BsDate.of(
      BS_LAST_PUBLISHED_YEAR,
      12,
      daysInBsMonth(BS_LAST_PUBLISHED_YEAR, 12),
    );
    const next = BsDate.fromAd(
      // The day after, worked out in AD.
      (() => {
        const { year, month, day } = lastPublished.toAd();
        return { year, month, day: day + 1 };
      })(),
    );
    expect(next.toString()).toBe(`${firstProjected}-01-01`);
  });

  it('convert in both directions', () => {
    const date = adToBs({ year: 2030, month: 7, day: 20 });
    expect(date.isProjected).toBe(true);
    expect(bsToAd(date)).toEqual({ year: 2030, month: 7, day: 20 });
  });

  it(`reach ${BS_MAX_YEAR} and stop`, () => {
    expect(BsDate.of(BS_MAX_YEAR, 12, 1).year).toBe(BS_MAX_YEAR);
    expect(() => BsDate.of(BS_MAX_YEAR + 1, 1, 1)).toThrow(DateOutOfRangeError);
    expect(() => BsDate.of(BS_MAX_YEAR + 1, 1, 1)).not.toThrow(
      ProjectedDateError,
    );
  });
});

describe('confidence', () => {
  const key = (year: number, month: number) =>
    `${year}-${String(month).padStart(2, '0')}`;
  const flagged = new Set(UNCERTAIN_MONTH_STARTS);
  const isFlagged = (year: number, month: number) =>
    flagged.has(key(year, month)) ||
    flagged.has(month === 12 ? key(year + 1, 1) : key(year, month + 1));

  it('is published up to the last published year', () => {
    const date = BsDate.of(BS_LAST_PUBLISHED_YEAR, 12, 1);
    expect(date.confidence).toBe('published');
    expect(date.isProjected).toBe(false);
  });

  it('is uncertain where a month start next to the date is flagged', () => {
    expect(UNCERTAIN_MONTH_STARTS.length).toBeGreaterThan(0);
    const [year, month] = UNCERTAIN_MONTH_STARTS[0]!.split('-').map(Number);
    expect(BsDate.of(year!, month!, 1).confidence).toBe('uncertain');
    // The month before ends where the flagged month begins.
    const before = month === 1 ? [year! - 1, 12] : [year!, month! - 1];
    expect(BsDate.of(before[0]!, before[1]!, 1).confidence).toBe('uncertain');
  });

  it('is projected for every other projected month', () => {
    for (let year = firstProjected; year <= BS_MAX_YEAR; year++) {
      for (let month = 1; month <= 12; month++) {
        expect(BsDate.of(year, month, 1).confidence).toBe(
          isFlagged(year, month) ? 'uncertain' : 'projected',
        );
      }
    }
  });
});

describe('strict mode', () => {
  const strict = { strict: true } as const;

  it('accepts published dates', () => {
    expect(BsDate.of(2083, 1, 1, strict).toString()).toBe('2083-01-01');
    expect(adToBs({ year: 2026, month: 4, day: 14 }, strict).toString()).toBe(
      '2083-01-01',
    );
    expect(bsToAd({ year: 2083, month: 1, day: 1 }, strict)).toEqual({
      year: 2026,
      month: 4,
      day: 14,
    });
  });

  it('rejects projected dates with ProjectedDateError', () => {
    expect(() => BsDate.of(firstProjected, 1, 1, strict)).toThrow(
      ProjectedDateError,
    );
    expect(() => adToBs({ year: 2030, month: 7, day: 20 }, strict)).toThrow(
      ProjectedDateError,
    );
    expect(() =>
      bsToAd({ year: firstProjected, month: 1, day: 1 }, strict),
    ).toThrow(ProjectedDateError);
  });

  it('throws an error existing range checks already catch', () => {
    try {
      BsDate.of(firstProjected, 1, 1, strict);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DateOutOfRangeError);
      expect(error).toBeInstanceOf(BikramSambatError);
      expect((error as Error).name).toBe('ProjectedDateError');
    }
  });
});
