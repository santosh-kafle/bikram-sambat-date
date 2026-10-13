/**
 * The build-time Sūrya Siddhānta engine (scripts/astro). These tests guard
 * the projection's accuracy: if a change to the engine or its parameters
 * makes it worse on the published years, they fail.
 */
import { describe, expect, it } from 'vitest';
import { monthStart } from '../scripts/astro/sankranti.js';
import { kathmanduSunTimes } from '../scripts/astro/sun-times.js';
import { SIDEREAL_YEAR } from '../scripts/astro/surya-siddhanta.js';
import {
  loadVerifiedTable,
  monthStarts,
} from '../scripts/lib/verified-table.js';
import { gregorianToDayNumber } from '../src/core/gregorian.js';

const minutes = (hours: number) => Math.round(hours * 60);

describe('Sūrya Siddhānta constants', () => {
  it('has the classical sidereal year', () => {
    expect(SIDEREAL_YEAR).toBeCloseTo(365.258756, 6);
  });
});

describe('Kathmandu sunrise and sunset', () => {
  // Reference times for 27.7172° N, 85.324° E from api.sunrise-sunset.org,
  // in NPT. Mid-July and mid-January are when the Karka and Makara rules
  // compare a saṅkrānti with sunrise and sunset.
  it.each([
    ['2026-06-21', '05:07', '19:04'],
    ['2026-07-16', '05:17', '19:03'],
    ['2026-12-21', '06:49', '17:15'],
    ['2027-01-14', '06:54', '17:31'],
  ])('%s: sunrise %s, sunset %s', (iso, rise, set) => {
    const [y, m, d] = iso.split('-').map(Number);
    const { sunrise, sunset } = kathmanduSunTimes(
      gregorianToDayNumber(y!, m!, d!),
    );
    const toMinutes = (hhmm: string) => {
      const [h, min] = hhmm.split(':').map(Number);
      return h! * 60 + min!;
    };
    expect(Math.abs(minutes(sunrise) - toMinutes(rise))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutes(sunset) - toMinutes(set))).toBeLessThanOrEqual(3);
  });
});

describe('projection against the published calendars', async () => {
  const verified = await loadVerifiedTable();
  const { projection } = verified.config;
  const trials = [...monthStarts(verified)].map(([key, actual]) => {
    const [year, month] = key.split('-').map(Number) as [number, number];
    return { key, actual, projected: monthStart(year, month, projection) };
  });
  const misses = trials.filter((t) => t.projected.dayNumber !== t.actual);

  it('gets at least 99% of month starts right', () => {
    // 1,297 of 1,308 when calibrated; see data/ACCURACY.md.
    expect(trials.length - misses.length).toBeGreaterThanOrEqual(1297);
  });

  it('flags every month it gets wrong as uncertain', () => {
    for (const miss of misses) {
      expect(miss.projected.marginMinutes, miss.key).toBeLessThan(
        projection.uncertainMarginMinutes,
      );
    }
  });

  it('flags only a small share of months', () => {
    const flagged = trials.filter(
      (t) => t.projected.marginMinutes < projection.uncertainMarginMinutes,
    );
    expect(flagged.length / trials.length).toBeLessThan(0.06);
  });
});
