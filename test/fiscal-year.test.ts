import { describe, expect, it } from 'vitest';
import {
  BsDate,
  DateOutOfRangeError,
  DateParseError,
  FiscalYear,
  fiscalYearOf,
  ProjectedDateError,
} from '../src/index.js';

/** Midnight in Kathmandu (UTC+05:45) on an AD date, as an instant. */
const kathmanduMidnight = (iso: string) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) - (5 * 60 + 45) * 60_000);

// Cases ported from CartNext's src/core/common/fiscal-year.spec.ts.
describe('fiscal year of an instant', () => {
  it('knows Shrawan 1 of recent years', () => {
    expect(BsDate.fromInstant(kathmanduMidnight('2024-07-16')).toString()).toBe(
      '2081-04-01',
    );
    expect(BsDate.fromInstant(kathmanduMidnight('2025-07-17')).toString()).toBe(
      '2082-04-01',
    );
    expect(BsDate.fromInstant(kathmanduMidnight('2026-07-17')).toString()).toBe(
      '2083-04-01',
    );
    expect(BsDate.fromInstant(kathmanduMidnight('2026-04-14')).toString()).toBe(
      '2083-01-01',
    );
  });

  it('starts at midnight on Shrawan 1 in Kathmandu', () => {
    const start = kathmanduMidnight('2026-07-17');
    expect(start.toISOString()).toBe('2026-07-16T18:15:00.000Z');
    expect(fiscalYearOf(new Date(start.getTime() - 1)).label).toBe('2082/83');
    expect(fiscalYearOf(start).label).toBe('2083/84');
    expect(FiscalYear.of(2083).firstDay.toInstant()).toEqual(start);
  });

  it('keeps Baisakh to Asar in the previous fiscal year', () => {
    expect(fiscalYearOf(kathmanduMidnight('2026-04-14')).label).toBe('2082/83');
    expect(fiscalYearOf(kathmanduMidnight('2026-10-12')).label).toBe('2083/84');
  });

  it('gives the same answer whatever the server time zone', () => {
    const original = process.env.TZ;
    try {
      const instant = new Date('2026-07-16T18:15:00.000Z');
      const answers = ['UTC', 'America/New_York', 'Asia/Kathmandu'].map(
        (tz) => {
          process.env.TZ = tz;
          return [
            fiscalYearOf(instant).label,
            BsDate.fromInstant(instant).toString(),
          ];
        },
      );
      expect(answers).toEqual([
        ['2083/84', '2083-04-01'],
        ['2083/84', '2083-04-01'],
        ['2083/84', '2083-04-01'],
      ]);
    } finally {
      process.env.TZ = original;
    }
  });
});

describe('FiscalYear', () => {
  it('runs from 1 Shrawan to the last day of Asar', () => {
    const fy = FiscalYear.of(2083);
    expect(fy.startYear).toBe(2083);
    expect(fy.endYear).toBe(2084);
    expect(fy.firstDay.toString()).toBe('2083-04-01');
    expect(fy.lastDay.year).toBe(2084);
    expect(fy.lastDay.month).toBe(3);
    // The last day is followed directly by the next fiscal year's first.
    const next = BsDate.fromInstant(
      fy.lastDay.toInstant().getTime() + 86_400_000,
    );
    expect(next.equals(fy.next().firstDay)).toBe(true);
  });

  it('labels across a century', () => {
    expect(FiscalYear.of(2099).label).toBe('2099/00');
    expect(FiscalYear.of(2100).label).toBe('2100/01');
  });

  it('finds the fiscal year of a BsDate', () => {
    expect(FiscalYear.containing(BsDate.of(2083, 3, 32)).label).toBe('2082/83');
    expect(FiscalYear.containing(BsDate.of(2083, 4, 1)).label).toBe('2083/84');
    expect(FiscalYear.containing(BsDate.of(2084, 1, 1)).label).toBe('2083/84');
  });

  it('tells whether it contains a date', () => {
    const fy = FiscalYear.of(2083);
    expect(fy.contains(BsDate.of(2083, 4, 1))).toBe(true);
    expect(fy.contains(fy.lastDay)).toBe(true);
    expect(fy.contains(BsDate.of(2083, 3, 32))).toBe(false);
    expect(fy.contains(new Date('2026-10-13T06:00:00Z'))).toBe(true);
  });

  it('steps between years', () => {
    expect(FiscalYear.of(2083).next().label).toBe('2084/85');
    expect(FiscalYear.of(2083).previous().label).toBe('2082/83');
    expect(
      FiscalYear.of(2083).next().previous().equals(FiscalYear.of(2083)),
    ).toBe(true);
  });

  it('parses labels', () => {
    expect(FiscalYear.parse('2083/84').startYear).toBe(2083);
    expect(FiscalYear.parse(' 2083/2084 ').startYear).toBe(2083);
    expect(FiscalYear.parse('2099/00').startYear).toBe(2099);
    for (const bad of ['2083', '2083/85', '2083-84', '83/84', '2083/2085']) {
      expect(() => FiscalYear.parse(bad), bad).toThrow(DateParseError);
    }
  });

  it('serializes as its label', () => {
    expect(String(FiscalYear.of(2083))).toBe('2083/84');
    expect(JSON.stringify({ fy: FiscalYear.of(2083) })).toBe(
      '{"fy":"2083/84"}',
    );
  });

  it('is immutable', () => {
    expect(Object.isFrozen(FiscalYear.of(2083))).toBe(true);
  });

  it('covers 1975/76 to 2199/00', () => {
    expect(FiscalYear.of(1975).label).toBe('1975/76');
    expect(FiscalYear.of(2199).label).toBe('2199/00');
    expect(() => FiscalYear.of(1974)).toThrow(DateOutOfRangeError);
    expect(() => FiscalYear.of(2200)).toThrow(DateOutOfRangeError);
    // Baisakh 1975 belongs to fiscal year 1974/75, which is out of range.
    expect(() => FiscalYear.containing(BsDate.of(1975, 1, 1))).toThrow(
      DateOutOfRangeError,
    );
  });

  it('passes strict mode on to instants', () => {
    expect(() =>
      fiscalYearOf(new Date('2030-07-20T00:00:00Z'), { strict: true }),
    ).toThrow(ProjectedDateError);
  });
});
