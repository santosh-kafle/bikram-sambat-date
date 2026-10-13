import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  adToBs,
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  bsToAd,
  DateOutOfRangeError,
  InvalidDateError,
  supportedRange,
} from '../src/index.js';

const ad = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
};

/** Pairs of BS and AD dates known from outside the source tables. */
const anchors: [bs: string, ad: string, note: string][] = [
  ['2083-01-01', '2026-04-14', 'Nepali New Year 2083'],
  ['2083-04-01', '2026-07-17', 'Shrawan 1, fiscal year 2083/84 starts'],
  ['2082-04-01', '2025-07-17', 'Shrawan 1, fiscal year 2082/83 starts'],
  ['2081-04-01', '2024-07-16', 'Shrawan 1, fiscal year 2081/82 starts'],
  ['2081-01-01', '2024-04-13', 'Nepali New Year 2081'],
  ['2080-11-17', '2024-02-29', 'a Gregorian leap day'],
  ['2083-06-27', '2026-10-13', 'Hamro Patro "today" on retrieval'],
  ['2062-01-01', '2005-04-14', 'a year the sources disagree on'],
  ['2000-01-01', '1943-04-14', 'start of the subeshb1 table'],
];

describe('known dates', () => {
  it.each(anchors)('%s BS is %s AD (%s)', (bs, adIso) => {
    expect(adToBs(ad(adIso)).toString()).toBe(bs);
    expect(bsToAd(ad(bs))).toEqual(ad(adIso));
  });
});

describe('Hamro Patro reference', () => {
  const reference = JSON.parse(
    readFileSync(
      new URL('../data/references/hamropatro.json', import.meta.url),
      'utf8',
    ),
  ) as { months: Record<string, { days: number; startAd: string }> };
  const months = Object.entries(reference.months).filter(
    ([key]) => Number(key.slice(0, 4)) <= BS_MAX_YEAR,
  );

  it('covers some of the table', () => {
    expect(months.length).toBeGreaterThan(100);
  });

  it('agrees on the first day of every month it lists', () => {
    for (const [key, { startAd }] of months) {
      expect(adToBs(ad(startAd)).toString(), key).toBe(`${key}-01`);
    }
  });
});

describe('supported range', () => {
  it('runs from 1 Baisakh of the first year to the end of the last', () => {
    const range = supportedRange();
    expect(range.bs.min.toString()).toBe(`${BS_MIN_YEAR}-01-01`);
    expect(range.bs.max.year).toBe(BS_MAX_YEAR);
    expect(range.bs.max.month).toBe(12);
    expect(range.ad.min).toEqual(bsToAd(range.bs.min));
    expect(range.ad.max).toEqual(bsToAd(range.bs.max));
  });

  it('throws just outside it', () => {
    const { ad: adRange } = supportedRange();
    const before = { ...adRange.min, day: adRange.min.day - 1 };
    const after = { ...adRange.max, day: adRange.max.day + 1 };
    expect(() => adToBs(before)).toThrow(DateOutOfRangeError);
    expect(() => adToBs(after)).toThrow(DateOutOfRangeError);
  });
});

describe('input checking', () => {
  it('rejects Gregorian dates that do not exist', () => {
    expect(() => adToBs({ year: 2023, month: 2, day: 29 })).toThrow(
      InvalidDateError,
    );
  });

  it('rejects BS dates that do not exist', () => {
    expect(() => bsToAd({ year: 2083, month: 1, day: 32 })).toThrow(
      InvalidDateError,
    );
  });
});
