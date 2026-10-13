import { BsDate, type ConversionOptions } from './bs-date.js';
import { type AdDate, dayNumberToGregorian } from './core/gregorian.js';
import {
  BS_LAST_PUBLISHED_YEAR,
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  bsToDayNumber,
  tableDayNumberRange,
} from './core/table.js';
import { ProjectedDateError } from './errors.js';

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
 * @throws {DateOutOfRangeError} if the date is outside the supported range.
 * @throws {ProjectedDateError} with `{ strict: true }`, if the date falls in a
 *   projected year.
 */
export function adToBs(ad: AdDate, options: ConversionOptions = {}): BsDate {
  return BsDate.fromAd(ad, options);
}

/**
 * Converts a Bikram Sambat date to Gregorian.
 *
 * ```ts
 * bsToAd({ year: 2083, month: 1, day: 1 }); // { year: 2026, month: 4, day: 14 }
 * ```
 *
 * @throws {InvalidDateError} if the BS date does not exist.
 * @throws {DateOutOfRangeError} if the year is outside the supported range.
 * @throws {ProjectedDateError} with `{ strict: true }`, if the year is
 *   projected.
 */
export function bsToAd(
  bs: BsDateFields,
  options: ConversionOptions = {},
): AdDate {
  const dayNumber = bsToDayNumber(bs.year, bs.month, bs.day);
  if (options.strict && bs.year > BS_LAST_PUBLISHED_YEAR) {
    throw new ProjectedDateError(
      `${bs.year} BS is projected; published calendars end with ${BS_LAST_PUBLISHED_YEAR}`,
    );
  }
  return dayNumberToGregorian(dayNumber);
}

/** A span of dates, in both calendars. */
export interface DateRange {
  readonly bs: { readonly min: BsDate; readonly max: BsDate };
  readonly ad: { readonly min: AdDate; readonly max: AdDate };
}

/** The dates the library covers. */
export interface SupportedRange {
  /** Dates from published calendars. */
  readonly published: DateRange;
  /** Dates projected by the Sūrya Siddhānta, after the published ones. */
  readonly projected: DateRange;
}

/** The first and last dates the library can convert, published and projected. */
export function supportedRange(): SupportedRange {
  const { first, last } = tableDayNumberRange();
  const firstProjected = bsToDayNumber(BS_LAST_PUBLISHED_YEAR + 1, 1, 1);
  const range = (from: number, to: number): DateRange => {
    const min = dayNumberToGregorian(from);
    const max = dayNumberToGregorian(to);
    return {
      bs: { min: BsDate.fromAd(min), max: BsDate.fromAd(max) },
      ad: { min, max },
    };
  };
  return {
    published: range(first, firstProjected - 1),
    projected: range(firstProjected, last),
  };
}

export { BS_LAST_PUBLISHED_YEAR, BS_MAX_YEAR, BS_MIN_YEAR };
