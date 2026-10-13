/** The base class of every error this library throws. */
export class BikramSambatError extends Error {
  override name = 'BikramSambatError';
}

/**
 * A date lies outside the years the calendar table covers. Bikram Sambat
 * month lengths are set by the Nepal Panchanga Nirnayak Samiti and cannot be
 * derived by formula, so the library refuses to guess.
 */
export class DateOutOfRangeError extends BikramSambatError {
  override name = 'DateOutOfRangeError';
}

/** A year, month and day that do not name a real date, such as Baisakh 32. */
export class InvalidDateError extends BikramSambatError {
  override name = 'InvalidDateError';
}
