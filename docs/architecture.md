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

Turning an instant (a `Date`, or "now") into a calendar date needs a time
zone, Asia/Kathmandu. That is a separate concern, planned for a later
release.

## Layout

```
src/
  index.ts                  public exports
  bs-date.ts                BsDate, the immutable date value
  convert.ts                adToBs, bsToAd, supportedRange
  errors.ts                 BikramSambatError and subclasses
  core/
    gregorian.ts            Gregorian ↔ day number, weekday
    table.ts                BS ↔ day number, month and year lengths
  data/
    calendar.generated.ts   the table, written by scripts/build-calendar.ts
scripts/
  build-calendar.ts         cross-checks data/ and writes the table
  fetch-hamropatro.ts       refreshes the Hamro Patro reference
data/                       inputs and report; see data-sources.md
test/                       Vitest suites
```

## The table

`calendar.generated.ts` exports:

- `BS_MIN_YEAR` and `BS_MAX_YEAR`;
- `BS_EPOCH_DAY_NUMBER`, the day number of 1 Baisakh of `BS_MIN_YEAR`;
- `MONTH_LENGTHS`, one row of twelve numbers per year.

The rows stay plain arrays rather than being bit-packed. At about 7 KB of source the
size is negligible, and plain arrays keep every change to the data readable
in a diff.

`table.ts` builds a cumulative index of year start day numbers the first
time it is needed. A conversion then costs a binary search over about 110
years plus a walk of at most twelve months.

## Design rules

- **Months are 1-based** everywhere: Baisakh is 1, Chaitra is 12. Some
  popular libraries use 0-based months like `Date`, which causes off-by-one
  bugs in calling code.
- **`BsDate` is immutable.** Its fields are `readonly` and the object is
  frozen. It serializes to `"YYYY-MM-DD"`, so it can go straight into JSON
  responses.
- **Never guess.** Dates outside the table throw `DateOutOfRangeError`.
  Impossible dates, such as day 32 of a 31-day month or 30 February, throw
  `InvalidDateError`. Both extend `BikramSambatError`.
- **Zero runtime dependencies.** The package ships ESM and CommonJS builds
  with type definitions, and is marked side-effect free for tree shaking.
