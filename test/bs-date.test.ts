import { describe, expect, it } from 'vitest';
import {
  BikramSambatError,
  BsDate,
  DateOutOfRangeError,
  InvalidDateError,
} from '../src/index.js';

describe('BsDate', () => {
  it('exposes 1-based fields', () => {
    const date = BsDate.of(2083, 6, 27);
    expect([date.year, date.month, date.day]).toEqual([2083, 6, 27]);
  });

  it('converts to and from AD', () => {
    const date = BsDate.fromAd({ year: 2026, month: 10, day: 13 });
    expect(date.toString()).toBe('2083-06-27');
    expect(date.toAd()).toEqual({ year: 2026, month: 10, day: 13 });
  });

  it('knows the weekday, Sunday being 0', () => {
    expect(BsDate.of(2083, 6, 27).weekday).toBe(2); // Tuesday, 13 Oct 2026
    expect(BsDate.of(2083, 1, 1).weekday).toBe(2); // Tuesday, 14 Apr 2026
  });

  it('formats with zero padding and serializes as a string', () => {
    const date = BsDate.of(2083, 4, 1);
    expect(date.toString()).toBe('2083-04-01');
    expect(JSON.stringify({ date })).toBe('{"date":"2083-04-01"}');
  });

  it('compares by day', () => {
    const a = BsDate.of(2083, 3, 32);
    const b = BsDate.of(2083, 4, 1);
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
    expect(BsDate.compare(a, b)).toBe(-1);
    expect(a.equals(BsDate.fromAd(a.toAd()))).toBe(true);
    expect([b, a].sort(BsDate.compare)).toEqual([a, b]);
  });

  it('is immutable', () => {
    const date = BsDate.of(2083, 1, 1);
    expect(Object.isFrozen(date)).toBe(true);
    expect(() => {
      (date as { year: number }).year = 2084;
    }).toThrow(TypeError);
  });

  it('throws typed errors', () => {
    expect(() => BsDate.of(2083, 1, 32)).toThrow(InvalidDateError);
    expect(() => BsDate.of(1900, 1, 1)).toThrow(DateOutOfRangeError);
    expect(() => BsDate.fromAd({ year: 2026, month: 2, day: 30 })).toThrow(
      InvalidDateError,
    );
    try {
      BsDate.of(2083, 1, 32);
    } catch (error) {
      expect(error).toBeInstanceOf(BikramSambatError);
      expect((error as Error).name).toBe('InvalidDateError');
    }
  });
});

describe('time zones', () => {
  it('gives the same answers whatever the process time zone', () => {
    const original = process.env.TZ;
    try {
      const answers = [
        'UTC',
        'America/New_York',
        'Asia/Kathmandu',
        'Pacific/Kiritimati',
      ].map((tz) => {
        process.env.TZ = tz;
        return BsDate.fromAd({ year: 2026, month: 7, day: 17 }).toString();
      });
      expect(new Set(answers)).toEqual(new Set(['2083-04-01']));
    } finally {
      process.env.TZ = original;
    }
  });
});
