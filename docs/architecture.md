# Architecture

## Day numbers, not `Date` objects

Every date is reduced to an integer **day number**: the _Rata Die_ (RD) count
from Reingold and Dershowitz's _Calendrical Calculations_, where RD 1 is
Monday, 1 January 1 AD.

- **Gregorian ↔ day number** is pure integer arithmetic
  (`src/core/gregorian.ts`).
- **BS ↔ day number** is a lookup in the month-length table
  (`src/core/table.ts`).

A conversion is therefore `AD → day number → BS` or the reverse. A
JavaScript `Date` is never involved. `Date` represents an instant, and its
`getDate()` and similar methods read the server's local time zone. Libraries
that convert via `Date` give different answers on a server in UTC and one in
Kathmandu. Here the problem cannot arise. The test suite runs under several
time zones to prove it (`npm run test:tz`).

Instants (a `Date`, a timestamp, or "now") are the one place a time zone
enters. `src/core/kathmandu.ts` turns an instant into a day number in
Kathmandu time, using Kathmandu's fixed UTC offsets. It never uses the
server's zone. See [time-and-fiscal-year.md](time-and-fiscal-year.md).

## Layout

```
src/
  index.ts                  public exports
  bs-date.ts                BsDate, the immutable date value
  convert.ts                adToBs, bsToAd, supportedRange
  fiscal-year.ts            FiscalYear, fiscalYearOf
  format.ts                 format and parse patterns
  locale.ts                 month and weekday names, digits
  month-grid.ts             monthGrid
  nestjs/                   the bikram-sambat-date/nestjs entry point
    is-bs-date.ts           @IsBsDate(), isBsDate
    to-bs-date.ts           @ToBsDate()
    parse-bs-date.pipe.ts   ParseBsDatePipe
  errors.ts                 BikramSambatError and subclasses
  core/
    gregorian.ts            Gregorian ↔ day number, weekday
    kathmandu.ts            instant ↔ Kathmandu day number
    table.ts                BS ↔ day number, month and year lengths
  data/
    calendar.generated.ts   the table, written by scripts/build-calendar.ts
scripts/
  build-calendar.ts         writes the table: published years, then projected
  calibrate.ts              scores the projection, writes data/ACCURACY.md
  fetch-hamropatro.ts       refreshes the Hamro Patro reference
  lib/verified-table.ts     decides and checks the published years
  astro/                    Sūrya Siddhānta engine (build time only)
    surya-siddhanta.ts      the Sun's true sidereal longitude
    sankranti.ts            saṅkrāntis and the month rule
    sun-times.ts            Kathmandu sunrise and sunset
data/                       inputs and reports; see data-sources.md
test/                       Vitest suites
```

## The table

`calendar.generated.ts` exports:

- `BS_MIN_YEAR`, `BS_LAST_PUBLISHED_YEAR` and `BS_MAX_YEAR`;
- `BS_EPOCH_DAY_NUMBER`, the day number of 1 Baisakh of `BS_MIN_YEAR`;
- `MONTH_LENGTHS`, one row of twelve numbers per year, published years first,
  then projected ones;
- `UNCERTAIN_MONTH_STARTS`, the projected month starts that could be a day
  off (see [projection.md](projection.md)).

The rows stay plain arrays rather than being bit-packed. At about 15 KB of
source the size is small, and plain arrays keep every change to the data
readable in a diff.

The projection is computed when the table is built, not when the library
runs. The package contains no astronomy code. Results are the same on every
JavaScript engine, and every projected month can be reviewed in git.

`table.ts` builds a cumulative index of year start day numbers the first
time it is needed. A conversion then costs a binary search over about 225
years plus a walk of at most twelve months.

## Design rules

- **Months are 1-based** everywhere: Baisakh is 1, Chaitra is 12. Some
  popular libraries use 0-based months like `Date`, which causes off-by-one
  bugs in calling code.
- **`BsDate` is immutable.** Its fields are `readonly` and the object is
  frozen. It serializes to `"YYYY-MM-DD"`, so it can go straight into JSON
  responses.
- **Never guess silently.** Projected dates say so in `confidence`, and
  `{ strict: true }` rejects them with `ProjectedDateError`. Dates outside
  the table throw `DateOutOfRangeError`. Impossible dates, such as day 32 of
  a 31-day month or 30 February, throw `InvalidDateError`. All extend
  `BikramSambatError`.
- **Zero runtime dependencies.** The package ships ESM and CommonJS builds
  with type definitions, and is marked side-effect free for tree shaking.
  The NestJS helpers are a second entry point with optional peer
  dependencies. Both entry points share one build chunk, so a `BsDate` from
  either is an instance of the same class.
