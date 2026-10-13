import { describe, expect, it } from 'vitest';
import {
  BsDate,
  InvalidDateError,
  ProjectedDateError,
  supportedRange,
} from '../src/index.js';

const DAY = 86_400_000;

/** The Kathmandu calendar date of an instant, from Node's time zone data. */
const intl = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kathmandu',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const kathmanduDate = (ms: number) => intl.format(new Date(ms));

const iso = ({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const { published, projected } = supportedRange();
const firstMs = published.bs.min.toInstant().getTime();
const lastMs = projected.bs.max.toInstant().getTime() + DAY - 1;

describe('Kathmandu date of an instant', () => {
  it('matches the IANA time zone data across the whole range', () => {
    // A step that is not a whole number of hours lands at every time of day.
    for (let ms = firstMs; ms <= lastMs; ms += 3 * DAY + 3_917_000) {
      expect(
        iso(BsDate.fromInstant(ms).toAd()),
        new Date(ms).toISOString(),
      ).toBe(kathmanduDate(ms));
    }
  });

  it.each([
    // Local mean time (+5:41:16) until 1920.
    ['1918-04-12T18:18:44Z', '1918-04-13'],
    ['1918-04-12T18:18:43Z', null], // the day before the range
    // +5:30 from 1920; the clock went back 11m16s at midnight.
    ['1919-12-31T18:18:43Z', '1919-12-31'],
    ['1919-12-31T18:29:59Z', '1919-12-31'],
    ['1919-12-31T18:30:00Z', '1920-01-01'],
    // +5:45 from 1986; 00:00–00:15 on 1 January 1986 never happened.
    ['1985-12-31T18:29:59Z', '1985-12-31'],
    ['1985-12-31T18:30:00Z', '1986-01-01'],
    // Today's offset.
    ['2026-07-16T18:14:59Z', '2026-07-16'],
    ['2026-07-16T18:15:00Z', '2026-07-17'],
  ])('%s is %s in Kathmandu', (instant, expected) => {
    const ms = Date.parse(instant);
    expect(kathmanduDate(ms)).toBe(expected ?? '1918-04-12');
    if (expected) expect(iso(BsDate.fromInstant(ms).toAd())).toBe(expected);
  });

  it('accepts a Date or epoch milliseconds', () => {
    const date = new Date('2026-07-16T18:15:00Z');
    expect(BsDate.fromInstant(date).toString()).toBe('2083-04-01');
    expect(BsDate.fromInstant(date.getTime()).toString()).toBe('2083-04-01');
  });

  it('rejects invalid instants', () => {
    expect(() => BsDate.fromInstant(new Date('nonsense'))).toThrow(
      InvalidDateError,
    );
    expect(() => BsDate.fromInstant(Number.NaN)).toThrow(InvalidDateError);
  });

  it('honours strict mode', () => {
    expect(() =>
      BsDate.fromInstant(Date.UTC(2030, 6, 20), { strict: true }),
    ).toThrow(ProjectedDateError);
  });

  it('gives today in Kathmandu', () => {
    const before = Date.now();
    const today = BsDate.today();
    const after = Date.now();
    expect([
      BsDate.fromInstant(before).toString(),
      BsDate.fromInstant(after).toString(),
    ]).toContain(today.toString());
  });
});

describe('start of a Kathmandu day', () => {
  it.each([
    ['2026-07-17', '2026-07-16T18:15:00.000Z'],
    ['1986-01-02', '1986-01-01T18:15:00.000Z'],
    // 1 January 1986 began at 00:15, after the skipped quarter hour.
    ['1986-01-01', '1985-12-31T18:30:00.000Z'],
    ['1985-12-31', '1985-12-30T18:30:00.000Z'],
    // 1 January 1920 began at 00:00 +5:30, after 31 December ran 11m16s long.
    ['1920-01-01', '1919-12-31T18:30:00.000Z'],
    ['1919-12-31', '1919-12-30T18:18:44.000Z'],
  ])('the day %s AD starts at %s', (adIso, instant) => {
    const [year, month, day] = adIso.split('-').map(Number);
    const date = BsDate.fromAd({ year: year!, month: month!, day: day! });
    expect(date.toInstant().toISOString()).toBe(instant);
  });

  it('is the first instant of the day for every day in the range', () => {
    for (let ms = firstMs; ms <= lastMs; ms += 5 * DAY + 7_211_000) {
      const date = BsDate.fromInstant(ms);
      const start = date.toInstant().getTime();
      expect(BsDate.fromInstant(start).equals(date)).toBe(true);
      expect(kathmanduDate(start - 1)).not.toBe(kathmanduDate(start));
    }
  });
});
