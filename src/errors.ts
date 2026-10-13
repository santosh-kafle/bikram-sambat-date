/** The base class of every error this library throws. */
export class BikramSambatError extends Error {
  override name = 'BikramSambatError';
}

/**
 * A date lies outside the years the library covers: the published calendars
 * plus the projected years after them. See `supportedRange()`.
 */
export class DateOutOfRangeError extends BikramSambatError {
  override name = 'DateOutOfRangeError';
}

/** A year, month and day that do not name a real date, such as Baisakh 32. */
export class InvalidDateError extends BikramSambatError {
  override name = 'InvalidDateError';
}

/**
 * A date falls in a projected year, and the caller asked for published
 * dates only (`{ strict: true }`). Extends `DateOutOfRangeError`, so code
 * that already handles out-of-range dates handles this too.
 */
export class ProjectedDateError extends DateOutOfRangeError {
  override name = 'ProjectedDateError';
}
