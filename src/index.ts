/**
 * Bikram Sambat (BS) ↔ Gregorian (AD) date conversion.
 *
 * @packageDocumentation
 */
export { BsDate } from './bs-date.js';
export {
  adToBs,
  bsToAd,
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  supportedRange,
  type BsDateFields,
  type SupportedRange,
} from './convert.js';
export type { AdDate } from './core/gregorian.js';
export { daysInBsMonth, daysInBsYear, isValidBsDate } from './core/table.js';
export {
  BikramSambatError,
  DateOutOfRangeError,
  InvalidDateError,
} from './errors.js';
