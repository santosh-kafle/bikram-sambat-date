/**
 * Bikram Sambat (BS) ↔ Gregorian (AD) date conversion.
 *
 * @packageDocumentation
 */
export { BsDate, type ConversionOptions } from './bs-date.js';
export {
  adToBs,
  bsToAd,
  BS_LAST_PUBLISHED_YEAR,
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  supportedRange,
  type BsDateFields,
  type DateRange,
  type SupportedRange,
} from './convert.js';
export type { AdDate } from './core/gregorian.js';
export {
  daysInBsMonth,
  daysInBsYear,
  isValidBsDate,
  type DateConfidence,
} from './core/table.js';
export {
  BikramSambatError,
  DateOutOfRangeError,
  DateParseError,
  InvalidDateError,
  ProjectedDateError,
} from './errors.js';
export { FiscalYear, fiscalYearOf } from './fiscal-year.js';
export type { FormatOptions } from './format.js';
export {
  monthGrid,
  type GridDay,
  type MonthGridOptions,
} from './month-grid.js';
export { type Locale, toAsciiDigits, toDevanagariDigits } from './locale.js';
