# bikram-sambat-date

Accurate, time-zone-safe **Bikram Sambat (BS) ↔ Gregorian (AD)** date
conversion for Node.js backends. Zero dependencies.

```ts
import { adToBs, bsToAd, BsDate } from 'bikram-sambat-date';

adToBs({ year: 2026, month: 4, day: 14 }).toString(); // '2083-01-01'
bsToAd({ year: 2083, month: 4, day: 1 }); // { year: 2026, month: 7, day: 17 }
```

> **Status:** early development (0.1.0), not yet published to npm. See the
> [roadmap](#roadmap).

## Why another converter

- **Checked data.** BS month lengths cannot be calculated by a simple
  formula. They have to come from published calendars. This library's table
  is built by cross-checking six open-source tables against Hamro Patro.
  Every disagreement is recorded and decided in writing, and the build fails
  on any new one. See [docs/data-sources.md](docs/data-sources.md) and the
  generated [data report](data/REPORT.md).
- **Honest about range.** Calendars are published only about a year ahead.
  Other libraries ship guesses for later years as if they were fact, and
  those guesses have often been wrong. This library covers the published
  years and throws past them.
- **Server-time-zone safe.** Conversions never go through a JavaScript
  `Date`. The answer is the same on a server in UTC, New York or Kathmandu.
- **Backend-friendly.** It has 1-based months, immutable values, JSON output
  as `"YYYY-MM-DD"`, typed errors, ESM and CommonJS builds, and TypeScript
  types.

## Install

```sh
npm install bikram-sambat-date
```

Requires Node.js 22 or newer.

## Usage

### Converting

```ts
import { adToBs, bsToAd } from 'bikram-sambat-date';

const bs = adToBs({ year: 2026, month: 10, day: 13 });
bs.toString(); // '2083-06-27'

bsToAd({ year: 2083, month: 6, day: 27 }); // { year: 2026, month: 10, day: 13 }
```

Months are **1-based** in both calendars: Baisakh and January are 1.

### `BsDate`

```ts
import { BsDate } from 'bikram-sambat-date';

const date = BsDate.of(2083, 4, 1); // 1 Shrawan 2083
date.year; // 2083
date.month; // 4
date.day; // 1
date.weekday; // 5 (0 is Sunday): a Friday
date.toAd(); // { year: 2026, month: 7, day: 17 }
date.toString(); // '2083-04-01'
JSON.stringify({ date }); // '{"date":"2083-04-01"}'

const ad = BsDate.fromAd({ year: 2026, month: 4, day: 14 });
ad.equals(BsDate.of(2083, 1, 1)); // true
ad.isBefore(date); // true
[date, ad].sort(BsDate.compare); // earliest first
```

`BsDate` is immutable.

### Calendar facts

```ts
import {
  daysInBsMonth,
  daysInBsYear,
  isValidBsDate,
  supportedRange,
} from 'bikram-sambat-date';

daysInBsMonth(2083, 1); // 31
daysInBsYear(2083); // 365
isValidBsDate(2083, 1, 32); // false; never throws
supportedRange(); // first and last convertible dates, in BS and AD
```

### Errors

| Error                 | When                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `DateOutOfRangeError` | The date is outside the supported range.                         |
| `InvalidDateError`    | The date does not exist, such as 32 Baisakh 2083 or 30 February. |

Both extend `BikramSambatError`, so you can catch either one, or the base
class for both.

```ts
import { BikramSambatError, BsDate } from 'bikram-sambat-date';

try {
  BsDate.of(year, month, day);
} catch (error) {
  if (error instanceof BikramSambatError) {
    // reject the request with a 400
  }
  throw error;
}
```

## Supported range

**BS 1975-01-01 to 2083-12-30** (AD 1918-04-13 to 2027-04-13).

2083 is the latest year with a published calendar. Each new year will be
added in a release once its calendar is approved; see
[adding a year](docs/data-sources.md#adding-a-year-when-a-new-calendar-is-published).
For later dates, a Sūrya Siddhānta projection, clearly flagged as projected,
is planned. See the [roadmap](#roadmap).

## Roadmap

1. **Foundation (this release):** cross-checked table, conversion and
   `BsDate`.
2. **Projected range:** Sūrya Siddhānta month starts for years after the
   table, opt-in and flagged as projected.
3. **Kathmandu time and fiscal year:** convert instants in Asia/Kathmandu;
   Nepal fiscal year helpers (Shrawan 1 start).
4. **Formatting and parsing:** format tokens, Nepali month and weekday
   names, Devanagari digits, strict parsing.
5. **Arithmetic:** add days, months and years; differences; month
   boundaries; month grids.
6. **NestJS helpers:** `@IsBsDate()` validator, transformer and pipe, in a
   separate entry point.
7. **Release:** CI, package checks, publish.

## Development

```sh
npm install
npm run check      # typecheck, lint, format check, tests
npm run test:tz    # tests under several time zones
npm run build      # dist/: ESM, CommonJS and type definitions
npm run data:build # rebuild the calendar table from data/
```

- [docs/architecture.md](docs/architecture.md) explains how conversion works
  and how the code is laid out.
- [docs/data-sources.md](docs/data-sources.md) explains where the calendar
  data comes from and how to update it.

## License

MIT. The calendar data draws on the open-source projects listed in
[NOTICE](NOTICE).
