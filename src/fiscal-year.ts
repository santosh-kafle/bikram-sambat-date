import { BsDate, type ConversionOptions } from './bs-date.js';
import { BS_MAX_YEAR, BS_MIN_YEAR, daysInBsMonth } from './core/table.js';
import {
  DateOutOfRangeError,
  DateParseError,
  InvalidDateError,
} from './errors.js';

/** Shrawan, the first month of the fiscal year. */
const SHRAWAN = 4;
/** Asar, the last month of the fiscal year. */
const ASAR = 3;

const labelOf = (startYear: number) =>
  `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;

const toBsDate = (
  date: BsDate | Date | number,
  options: ConversionOptions,
): BsDate =>
  date instanceof BsDate ? date : BsDate.fromInstant(date, options);

/**
 * A Nepali fiscal year (_arthik barsa_). It runs from 1 Shrawan to the last
 * day of Asar of the next year: fiscal year 2083/84 is 1 Shrawan 2083
 * (17 July 2026) to 32 Asar 2084.
 *
 * ```ts
 * FiscalYear.containing(new Date()).label; // '2083/84'
 * FiscalYear.parse('2083/84').firstDay.toAd(); // { year: 2026, month: 7, day: 17 }
 * ```
 *
 * Covers fiscal years 1975/76 to 2199/00, whose days are all in the
 * supported range.
 */
export class FiscalYear {
  /** The BS year the fiscal year starts in, such as 2083. */
  readonly startYear: number;
  /** The BS year it ends in, `startYear + 1`. */
  readonly endYear: number;
  /** The usual label, such as `2083/84`. */
  readonly label: string;
  /** 1 Shrawan of `startYear`. */
  readonly firstDay: BsDate;
  /** The last day of Asar of `endYear`. */
  readonly lastDay: BsDate;

  private constructor(startYear: number) {
    if (!Number.isInteger(startYear)) {
      throw new InvalidDateError(
        `Fiscal year must start in an integer year, got ${startYear}`,
      );
    }
    if (startYear < BS_MIN_YEAR || startYear + 1 > BS_MAX_YEAR) {
      throw new DateOutOfRangeError(
        `Fiscal year ${labelOf(startYear)} is outside the supported range ` +
          `${labelOf(BS_MIN_YEAR)}–${labelOf(BS_MAX_YEAR - 1)}`,
      );
    }
    this.startYear = startYear;
    this.endYear = startYear + 1;
    this.label = labelOf(startYear);
    this.firstDay = BsDate.of(startYear, SHRAWAN, 1);
    this.lastDay = BsDate.of(
      this.endYear,
      ASAR,
      daysInBsMonth(this.endYear, ASAR),
    );
    Object.freeze(this);
  }

  /**
   * The fiscal year starting in BS year `startYear`.
   *
   * @throws {DateOutOfRangeError} if it is outside the supported range.
   */
  static of(startYear: number): FiscalYear {
    return new FiscalYear(startYear);
  }

  /**
   * The fiscal year with a label such as `2083/84` or `2083/2084`.
   *
   * @throws {DateParseError} if the label is not in either form, or its two
   *   years are not consecutive.
   * @throws {DateOutOfRangeError} if it is outside the supported range.
   */
  static parse(label: string): FiscalYear {
    const match = /^(\d{4})\/(\d{2}|\d{4})$/.exec(label.trim());
    if (!match) {
      throw new DateParseError(
        `Not a fiscal year label: '${label}' (expected e.g. 2083/84)`,
      );
    }
    const startYear = Number(match[1]);
    const end = match[2]!;
    const expectedEnd =
      end.length === 2 ? labelOf(startYear).slice(5) : String(startYear + 1);
    if (end !== expectedEnd) {
      throw new DateParseError(
        `Not a fiscal year label: '${label}' (the years must be consecutive)`,
      );
    }
    return new FiscalYear(startYear);
  }

  /**
   * The fiscal year a date falls in. An instant (`Date` or epoch
   * milliseconds) is read as a Kathmandu calendar date first, so a fiscal
   * year starts at midnight on 1 Shrawan in Kathmandu.
   *
   * @throws {DateOutOfRangeError} if the fiscal year is outside the
   *   supported range.
   * @throws {ProjectedDateError} with `{ strict: true }`, if an instant falls
   *   in a projected year.
   */
  static containing(
    date: BsDate | Date | number,
    options: ConversionOptions = {},
  ): FiscalYear {
    const bs = toBsDate(date, options);
    return new FiscalYear(bs.month >= SHRAWAN ? bs.year : bs.year - 1);
  }

  /**
   * Whether a date falls in this fiscal year. Instants are read as Kathmandu
   * calendar dates.
   */
  contains(date: BsDate | Date | number): boolean {
    const bs = toBsDate(date, {});
    return !bs.isBefore(this.firstDay) && !bs.isAfter(this.lastDay);
  }

  /** The fiscal year after this one. */
  next(): FiscalYear {
    return new FiscalYear(this.startYear + 1);
  }

  /** The fiscal year before this one. */
  previous(): FiscalYear {
    return new FiscalYear(this.startYear - 1);
  }

  /** Whether `other` is the same fiscal year. */
  equals(other: FiscalYear): boolean {
    return this.startYear === other.startYear;
  }

  /** The label, such as `2083/84`. */
  toString(): string {
    return this.label;
  }

  /** Serializes as the label, such as `"2083/84"`. */
  toJSON(): string {
    return this.label;
  }
}

/**
 * The fiscal year a date or instant falls in. Shorthand for
 * `FiscalYear.containing`.
 *
 * ```ts
 * fiscalYearOf(new Date('2026-07-16T18:15:00Z')).label; // '2083/84'
 * ```
 */
export function fiscalYearOf(
  date: BsDate | Date | number,
  options: ConversionOptions = {},
): FiscalYear {
  return FiscalYear.containing(date, options);
}
