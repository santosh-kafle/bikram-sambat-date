import {
  type AdDate,
  dayNumberToGregorian,
  gregorianToDayNumber,
  isValidGregorianDate,
  weekdayOf,
} from './core/gregorian.js';
import {
  BS_LAST_PUBLISHED_YEAR,
  bsToDayNumber,
  type DateConfidence,
  dayNumberToBs,
  monthConfidence,
} from './core/table.js';
import { InvalidDateError, ProjectedDateError } from './errors.js';

const pad = (n: number, width: number): string =>
  String(n).padStart(width, '0');

/** Options for creating or converting dates. */
export interface ConversionOptions {
  /**
   * Accept only dates from published calendars. A date in a projected year
   * throws `ProjectedDateError` instead. Defaults to `false`.
   */
  readonly strict?: boolean;
}

/**
 * An immutable Bikram Sambat calendar date: a day, with no time or time zone.
 *
 * Months are 1-based: Baisakh is 1 and Chaitra is 12.
 *
 * ```ts
 * const newYear = BsDate.of(2083, 1, 1);
 * newYear.toAd(); // { year: 2026, month: 4, day: 14 }
 * BsDate.fromAd({ year: 2026, month: 4, day: 14 }).toString(); // '2083-01-01'
 * ```
 */
export class BsDate {
  /** The BS year, such as 2083. */
  readonly year: number;
  /** The BS month, 1–12; Baisakh is 1. */
  readonly month: number;
  /** The day of the month, 1–32. */
  readonly day: number;
  readonly #dayNumber: number;

  private constructor(dayNumber: number, options: ConversionOptions) {
    const { year, month, day } = dayNumberToBs(dayNumber);
    if (options.strict && year > BS_LAST_PUBLISHED_YEAR) {
      throw new ProjectedDateError(
        `${year} BS is projected; published calendars end with ${BS_LAST_PUBLISHED_YEAR}`,
      );
    }
    this.year = year;
    this.month = month;
    this.day = day;
    this.#dayNumber = dayNumber;
    Object.freeze(this);
  }

  /**
   * The BS date `year`-`month`-`day`.
   *
   * @throws {InvalidDateError} if the date does not exist, such as day 32 of
   *   a 31-day month.
   * @throws {DateOutOfRangeError} if the year is outside the supported range.
   * @throws {ProjectedDateError} with `{ strict: true }`, if the year is
   *   projected.
   */
  static of(
    year: number,
    month: number,
    day: number,
    options: ConversionOptions = {},
  ): BsDate {
    return new BsDate(bsToDayNumber(year, month, day), options);
  }

  /**
   * The BS date on the same day as a Gregorian date.
   *
   * @throws {InvalidDateError} if the Gregorian date does not exist.
   * @throws {DateOutOfRangeError} if the date is outside the supported range.
   * @throws {ProjectedDateError} with `{ strict: true }`, if the date falls
   *   in a projected year.
   */
  static fromAd(ad: AdDate, options: ConversionOptions = {}): BsDate {
    const { year, month, day } = ad;
    if (!isValidGregorianDate(year, month, day)) {
      throw new InvalidDateError(
        `${year}-${month}-${day} is not a Gregorian date`,
      );
    }
    return new BsDate(gregorianToDayNumber(year, month, day), options);
  }

  /** Orders two dates: negative if `a` is earlier, 0 if equal, positive if later. */
  static compare(a: BsDate, b: BsDate): number {
    return a.#dayNumber - b.#dayNumber;
  }

  /** The day of the week: 0 is Sunday (Aaitabar), 6 is Saturday (Shanibar). */
  get weekday(): number {
    return weekdayOf(this.#dayNumber);
  }

  /**
   * How far this date can be trusted: `published`, `projected` or
   * `uncertain`. See `DateConfidence` and docs/projection.md.
   */
  get confidence(): DateConfidence {
    return monthConfidence(this.year, this.month);
  }

  /** Whether this date falls in a projected year rather than a published one. */
  get isProjected(): boolean {
    return this.year > BS_LAST_PUBLISHED_YEAR;
  }

  /** The Gregorian date of the same day. */
  toAd(): AdDate {
    return dayNumberToGregorian(this.#dayNumber);
  }

  /** Whether `other` is the same day. */
  equals(other: BsDate): boolean {
    return this.#dayNumber === other.#dayNumber;
  }

  /** Whether this date is earlier than `other`. */
  isBefore(other: BsDate): boolean {
    return this.#dayNumber < other.#dayNumber;
  }

  /** Whether this date is later than `other`. */
  isAfter(other: BsDate): boolean {
    return this.#dayNumber > other.#dayNumber;
  }

  /** The date as `YYYY-MM-DD`, such as `2083-01-01`. */
  toString(): string {
    return `${pad(this.year, 4)}-${pad(this.month, 2)}-${pad(this.day, 2)}`;
  }

  /** Serializes as `YYYY-MM-DD`, so `JSON.stringify` gives a plain string. */
  toJSON(): string {
    return this.toString();
  }
}
