import { BsDate } from './bs-date.js';
import { type AdDate, dayNumberToGregorian } from './core/gregorian.js';
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  bsToDayNumber,
  tableDayNumberRange,
} from './core/table.js';

/** A BS date as plain fields. `month` is 1–12 (Baisakh is 1). */
export interface BsDateFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * Converts a Gregorian date to Bikram Sambat.
 *
 * ```ts
 * adToBs({ year: 2026, month: 4, day: 14 }).toString(); // '2083-01-01'
 * ```
 *
 * @throws {InvalidDateError} if the Gregorian date does not exist.
 * @throws {DateOutOfRangeError} if the date is outside the table.
 */
export function adToBs(ad: AdDate): BsDate {
  return BsDate.fromAd(ad);
}

/**
 * Converts a Bikram Sambat date to Gregorian.
 *
 * ```ts
 * bsToAd({ year: 2083, month: 1, day: 1 }); // { year: 2026, month: 4, day: 14 }
 * ```
 *
 * @throws {InvalidDateError} if the BS date does not exist.
 * @throws {DateOutOfRangeError} if the year is outside the table.
 */
export function bsToAd(bs: BsDateFields): AdDate {
  return dayNumberToGregorian(bsToDayNumber(bs.year, bs.month, bs.day));
}

/** The dates the calendar table covers, in both calendars. */
export interface SupportedRange {
  readonly bs: { readonly min: BsDateFields; readonly max: BsDateFields };
  readonly ad: { readonly min: AdDate; readonly max: AdDate };
}

/** The first and last dates the library can convert. */
export function supportedRange(): SupportedRange {
  const { first, last } = tableDayNumberRange();
  const min = dayNumberToGregorian(first);
  const max = dayNumberToGregorian(last);
  return {
    bs: {
      min: BsDate.fromAd(min),
      max: BsDate.fromAd(max),
    },
    ad: { min, max },
  };
}

export { BS_MAX_YEAR, BS_MIN_YEAR };
