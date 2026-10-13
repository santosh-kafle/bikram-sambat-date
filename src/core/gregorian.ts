/**
 * Proleptic Gregorian calendar arithmetic on plain integers.
 *
 * Every date in this library is reduced to a day number: the Rata Die (RD)
 * count used by Reingold & Dershowitz's *Calendrical Calculations*, where
 * RD 1 is Monday, 1 January 1 AD. Working on integers instead of `Date`
 * objects means a conversion can never depend on the server's time zone.
 */

/** A Gregorian calendar date. `month` is 1–12 (January is 1). */
export interface AdDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const floorDiv = (a: number, b: number): number => Math.floor(a / b);

/** Whether `year` is a Gregorian leap year. */
export function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** The number of days in a Gregorian month (`month` is 1–12). */
export function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) return isGregorianLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** Whether `year`-`month`-`day` names a real Gregorian date. */
export function isValidGregorianDate(
  year: number,
  month: number,
  day: number,
): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInGregorianMonth(year, month)
  );
}

/** The RD day number of a Gregorian date. The date is not validated. */
export function gregorianToDayNumber(
  year: number,
  month: number,
  day: number,
): number {
  const y = year - 1;
  const leapCorrection = month <= 2 ? 0 : isGregorianLeapYear(year) ? -1 : -2;
  return (
    365 * y +
    floorDiv(y, 4) -
    floorDiv(y, 100) +
    floorDiv(y, 400) +
    floorDiv(367 * month - 362, 12) +
    leapCorrection +
    day
  );
}

/** The Gregorian date of an RD day number. */
export function dayNumberToGregorian(dayNumber: number): AdDate {
  const year = gregorianYearOf(dayNumber);
  const priorDays = dayNumber - gregorianToDayNumber(year, 1, 1);
  const correction =
    dayNumber < gregorianToDayNumber(year, 3, 1)
      ? 0
      : isGregorianLeapYear(year)
        ? 1
        : 2;
  const month = floorDiv(12 * (priorDays + correction) + 373, 367);
  const day = dayNumber - gregorianToDayNumber(year, month, 1) + 1;
  return { year, month, day };
}

function gregorianYearOf(dayNumber: number): number {
  const d0 = dayNumber - 1;
  const n400 = floorDiv(d0, 146097);
  const d1 = d0 - n400 * 146097;
  const n100 = floorDiv(d1, 36524);
  const d2 = d1 - n100 * 36524;
  const n4 = floorDiv(d2, 1461);
  const d3 = d2 - n4 * 1461;
  const n1 = floorDiv(d3, 365);
  const year = 400 * n400 + 100 * n100 + 4 * n4 + n1;
  // The last day of a 4- or 400-year cycle belongs to the year before.
  return n100 === 4 || n1 === 4 ? year : year + 1;
}

/** The weekday of an RD day number: 0 is Sunday, 6 is Saturday. */
export function weekdayOf(dayNumber: number): number {
  return ((dayNumber % 7) + 7) % 7;
}
