import {
  type AdDate,
  dayNumberToGregorian,
  gregorianToDayNumber,
  isValidGregorianDate,
  weekdayOf,
} from './core/gregorian.js';
import { dayNumberAtInstant, startOfDayInstant } from './core/kathmandu.js';
import {
  BS_LAST_PUBLISHED_YEAR,
  bsToDayNumber,
  type DateConfidence,
  dayNumberToBs,
  monthConfidence,
} from './core/table.js';
import {
  DateParseError,
  InvalidDateError,
  ProjectedDateError,
} from './errors.js';
import {
  DEFAULT_PATTERN,
  formatFields,
  type FormatOptions,
  parseFields,
} from './format.js';

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

  /**
   * The Kathmandu calendar date at an instant, whatever the server's time
   * zone. 2026-07-16T18:15:00Z is already 17 July in Kathmandu, so it gives
   * 1 Shrawan 2083.
   *
   * @param instant a `Date`, or milliseconds since the Unix epoch.
   * @throws {InvalidDateError} if `instant` is an invalid `Date` or not a
   *   finite number.
   * @throws {DateOutOfRangeError} if the date is outside the supported range.
   * @throws {ProjectedDateError} with `{ strict: true }`, if the date falls
   *   in a projected year.
   */
  static fromInstant(
    instant: Date | number,
    options: ConversionOptions = {},
  ): BsDate {
    const epochMs = typeof instant === 'number' ? instant : instant.getTime();
    if (!Number.isFinite(epochMs)) {
      throw new InvalidDateError(`Not a valid instant: ${String(instant)}`);
    }
    return new BsDate(dayNumberAtInstant(epochMs), options);
  }

  /** Today's date in Kathmandu. See `fromInstant`. */
  static today(options: ConversionOptions = {}): BsDate {
    return BsDate.fromInstant(Date.now(), options);
  }

  /**
   * Reads a BS date from a string. Digits may be ASCII or Devanagari, and
   * month and weekday names may be English or Nepali in any common spelling.
   * See docs/formatting.md for the pattern tokens.
   *
   * ```ts
   * BsDate.parse('2083-04-01');
   * BsDate.parse('१ साउन २०८३', 'D MMMM YYYY');
   * BsDate.parse('1 Shrawan 2083', 'D MMMM YYYY');
   * ```
   *
   * @param pattern defaults to `YYYY-MM-DD`.
   * @throws {DateParseError} if the string does not match the pattern, or
   *   names a weekday the date does not fall on.
   * @throws {InvalidDateError} if it matches but the date does not exist,
   *   such as 2083-01-32.
   * @throws {DateOutOfRangeError} if the year is outside the supported range.
   * @throws {ProjectedDateError} with `{ strict: true }`, if the year is
   *   projected.
   */
  static parse(
    text: string,
    pattern: string = DEFAULT_PATTERN,
    options: ConversionOptions = {},
  ): BsDate {
    const fields = parseFields(text, pattern);
    const date = BsDate.of(fields.year, fields.month, fields.day, options);
    if (fields.weekday !== undefined && fields.weekday !== date.weekday) {
      throw new DateParseError(
        `'${text}' names the wrong weekday: ${date.toString()} is not that day`,
      );
    }
    return date;
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

  /**
   * The instant this day begins in Kathmandu: local midnight, such as
   * 2026-07-16T18:15:00Z for 1 Shrawan 2083. Use it to query timestamps
   * that fall on this day (`>= date.toInstant()` and
   * `< nextDay.toInstant()`).
   */
  toInstant(): Date {
    return new Date(startOfDayInstant(this.#dayNumber));
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

  /**
   * Formats the date with a pattern. See docs/formatting.md for the tokens.
   *
   * ```ts
   * const date = BsDate.of(2083, 4, 1);
   * date.format('D MMMM YYYY, dddd'); // '1 Shrawan 2083, Friday'
   * date.format('D MMMM YYYY, dddd', { locale: 'ne' }); // '१ साउन २०८३, शुक्रवार'
   * ```
   *
   * @param pattern defaults to `YYYY-MM-DD`.
   */
  format(
    pattern: string = DEFAULT_PATTERN,
    options: FormatOptions = {},
  ): string {
    return formatFields(this, pattern, options);
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
