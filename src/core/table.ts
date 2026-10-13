/**
 * The Bikram Sambat calendar table: month lengths for every supported year,
 * and the mapping between BS dates and RD day numbers.
 *
 * The data lives in `src/data/calendar.generated.ts`, which
 * `npm run data:build` writes from the sources in `data/`. Years up to
 * `BS_LAST_PUBLISHED_YEAR` follow published calendars (see
 * `docs/data-sources.md`); later years are projected (see
 * `docs/projection.md`).
 */
import {
  BS_EPOCH_DAY_NUMBER,
  BS_LAST_PUBLISHED_YEAR,
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  MONTH_LENGTHS,
  UNCERTAIN_MONTH_STARTS,
} from '../data/calendar.generated.js';
import { DateOutOfRangeError, InvalidDateError } from '../errors.js';

export { BS_LAST_PUBLISHED_YEAR, BS_MAX_YEAR, BS_MIN_YEAR };

/**
 * How far a BS date can be trusted:
 *
 * - `published`: the month is in a calendar the Nepal Panchanga Nirnayak
 *   Samiti has published.
 * - `projected`: the month is computed by the Sūrya Siddhānta for a year not
 *   yet published. Measured on the published years, such months were right
 *   every time.
 * - `uncertain`: a projected month whose first or last day could move by one
 *   day, because a saṅkrānti falls close to a boundary of the month rule.
 */
export type DateConfidence = 'published' | 'projected' | 'uncertain';

/**
 * `yearStarts[i]` is the day number of 1 Baisakh of `BS_MIN_YEAR + i`; the
 * final entry is the day after the table ends. Built on first use.
 */
let yearStarts: Int32Array | undefined;

function getYearStarts(): Int32Array {
  if (!yearStarts) {
    const starts = new Int32Array(MONTH_LENGTHS.length + 1);
    starts[0] = BS_EPOCH_DAY_NUMBER;
    MONTH_LENGTHS.forEach((months, i) => {
      starts[i + 1] = starts[i]! + months.reduce((sum, days) => sum + days, 0);
    });
    yearStarts = starts;
  }
  return yearStarts;
}

let uncertainStarts: ReadonlySet<string> | undefined;

/**
 * The confidence of every date in BS month `month` of `year`. A projected
 * month is uncertain if its own start or the next month's start is flagged:
 * either can shift some of its dates by a day.
 */
export function monthConfidence(year: number, month: number): DateConfidence {
  if (year <= BS_LAST_PUBLISHED_YEAR) return 'published';
  uncertainStarts ??= new Set(UNCERTAIN_MONTH_STARTS);
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  const next = month === 12 ? key(year + 1, 1) : key(year, month + 1);
  return uncertainStarts.has(key(year, month)) || uncertainStarts.has(next)
    ? 'uncertain'
    : 'projected';
}

/** The first and last day numbers the table covers. */
export function tableDayNumberRange(): { first: number; last: number } {
  const starts = getYearStarts();
  return { first: starts[0]!, last: starts[starts.length - 1]! - 1 };
}

function assertYearInRange(year: number): void {
  if (!Number.isInteger(year)) {
    throw new InvalidDateError(`BS year must be an integer, got ${year}`);
  }
  if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
    throw new DateOutOfRangeError(
      `BS year ${year} is outside the supported range ${BS_MIN_YEAR}–${BS_MAX_YEAR}`,
    );
  }
}

/** The number of days (29–32) in a BS month. `month` is 1–12. */
export function daysInBsMonth(year: number, month: number): number {
  assertYearInRange(year);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new InvalidDateError(`BS month must be 1–12, got ${month}`);
  }
  return MONTH_LENGTHS[year - BS_MIN_YEAR]![month - 1]!;
}

/** The number of days (365 or 366) in a BS year. */
export function daysInBsYear(year: number): number {
  assertYearInRange(year);
  const starts = getYearStarts();
  const i = year - BS_MIN_YEAR;
  return starts[i + 1]! - starts[i]!;
}

/**
 * Whether `year`-`month`-`day` names a real BS date inside the table.
 * Never throws.
 */
export function isValidBsDate(
  year: number,
  month: number,
  day: number,
): boolean {
  return (
    Number.isInteger(year) &&
    year >= BS_MIN_YEAR &&
    year <= BS_MAX_YEAR &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= MONTH_LENGTHS[year - BS_MIN_YEAR]![month - 1]!
  );
}

/** The day number of a BS date. Throws if the date is invalid or out of range. */
export function bsToDayNumber(
  year: number,
  month: number,
  day: number,
): number {
  const length = daysInBsMonth(year, month);
  if (!Number.isInteger(day) || day < 1 || day > length) {
    throw new InvalidDateError(
      `${year}-${month}-${day} BS is not a date: month ${month} of ${year} has ${length} days`,
    );
  }
  const months = MONTH_LENGTHS[year - BS_MIN_YEAR]!;
  let dayNumber = getYearStarts()[year - BS_MIN_YEAR]!;
  for (let m = 0; m < month - 1; m++) dayNumber += months[m]!;
  return dayNumber + day - 1;
}

/** The BS year, month and day of a day number. Throws outside the table. */
export function dayNumberToBs(dayNumber: number): {
  year: number;
  month: number;
  day: number;
} {
  const starts = getYearStarts();
  const { first, last } = tableDayNumberRange();
  if (dayNumber < first || dayNumber > last) {
    throw new DateOutOfRangeError(
      `The date is outside the supported range ${BS_MIN_YEAR}–${BS_MAX_YEAR} BS`,
    );
  }
  // Binary search for the last year starting on or before dayNumber.
  let lo = 0;
  let hi = starts.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= dayNumber) lo = mid;
    else hi = mid - 1;
  }
  let remaining = dayNumber - starts[lo]!;
  const months = MONTH_LENGTHS[lo]!;
  let month = 0;
  while (remaining >= months[month]!) remaining -= months[month++]!;
  return { year: BS_MIN_YEAR + lo, month: month + 1, day: remaining + 1 };
}
