import { BsDate } from './bs-date.js';
import { DateOutOfRangeError } from './errors.js';

/** Options for `monthGrid`. */
export interface MonthGridOptions {
  /**
   * The weekday each row starts on: 0 is Sunday (the default, as on Nepali
   * calendars), 1 is Monday, and so on.
   */
  readonly weekStartsOn?: number;
}

/** One cell of a month grid. */
export interface GridDay {
  readonly date: BsDate;
  /** Whether the date is in the requested month, not a neighbouring one. */
  readonly inMonth: boolean;
}

/**
 * A BS month laid out in weeks, as on a wall calendar: four to six rows of
 * seven days. Days from the neighbouring months fill the first and last
 * weeks; they are `null` only where they fall outside the supported range.
 *
 * ```ts
 * const weeks = monthGrid(2083, 4); // Shrawan 2083
 * weeks[0]![5]!.date.toString(); // '2083-04-01', a Friday
 * ```
 *
 * @throws {RangeError} if `weekStartsOn` is not 0–6.
 * @throws {InvalidDateError} if `month` is not 1–12.
 * @throws {DateOutOfRangeError} if the month is outside the supported range.
 */
export function monthGrid(
  year: number,
  month: number,
  options: MonthGridOptions = {},
): (GridDay | null)[][] {
  const weekStartsOn = options.weekStartsOn ?? 0;
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new RangeError(`weekStartsOn must be 0–6, got ${weekStartsOn}`);
  }
  const first = BsDate.of(year, month, 1);
  const leading = (first.weekday - weekStartsOn + 7) % 7;
  const weeks = Math.ceil((leading + first.daysInMonth) / 7);

  const cell = (offset: number): GridDay | null => {
    try {
      const date = first.addDays(offset);
      return { date, inMonth: date.month === month && date.year === year };
    } catch (error) {
      if (error instanceof DateOutOfRangeError) return null;
      throw error;
    }
  };
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) =>
      cell(week * 7 + weekday - leading),
    ),
  );
}
