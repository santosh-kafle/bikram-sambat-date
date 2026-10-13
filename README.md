# bikram-sambat-date

[![CI](https://github.com/santosh-kafle/bikram-sambat-date/actions/workflows/ci.yml/badge.svg)](https://github.com/santosh-kafle/bikram-sambat-date/actions/workflows/ci.yml)

Accurate, time-zone-safe **Bikram Sambat (BS) ↔ Gregorian (AD)** date
conversion for Node.js backends. Zero dependencies.

```ts
import { adToBs, bsToAd, BsDate } from 'bikram-sambat-date';

adToBs({ year: 2026, month: 4, day: 14 }).toString(); // '2083-01-01'
bsToAd({ year: 2083, month: 4, day: 1 }); // { year: 2026, month: 7, day: 17 }
```

> **Status:** pre-1.0. The API may still change in minor releases. Calendars
> are published up to BS 2083; update the package each year to get the
> newly published year.

## Why another converter

- **Checked data.** BS month lengths cannot be calculated by a simple
  formula. They have to come from published calendars. This library's table
  is built by cross-checking six open-source tables against Hamro Patro.
  Every disagreement is recorded and decided in writing, and the build fails
  on any new one. See [docs/data-sources.md](docs/data-sources.md) and the
  generated [data report](data/REPORT.md).
- **Honest about the future.** Calendars are published only about a year
  ahead. Other libraries ship guesses for later years as if they were fact,
  and those guesses have often been wrong. This library projects later years
  from the Sūrya Siddhānta, the astronomy Nepal's calendar committee uses. It
  is calibrated to 99.2% of published month starts, and every date tells you
  whether it is `published`, `projected` or `uncertain`. See
  [docs/projection.md](docs/projection.md).
- **Server-time-zone safe.** Conversions never go through a JavaScript
  `Date`. The answer is the same on a server in UTC, New York or Kathmandu.
- **Backend-friendly.** It has 1-based months, immutable values, JSON output
  as `"YYYY-MM-DD"`, typed errors, ESM and CommonJS builds, TypeScript types,
  and NestJS validation helpers.

## Install

```sh
npm install bikram-sambat-date
```

Requires Node.js 22 or newer. No dependencies; about 10 KB gzipped, and the
optional NestJS helpers add 1 KB.

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

### Arithmetic

```ts
import { BsDate, monthGrid } from 'bikram-sambat-date';

const date = BsDate.of(2083, 3, 32); // 32 Asar 2083
date.addDays(1); // 2083-04-01
date.addMonths(1); // 2083-04-31, clamped to the end of Shrawan
date.endOfMonth(); // 2083-03-32
BsDate.today().diffInYears(BsDate.of(2050, 6, 28)); // age in BS years
monthGrid(2083, 4); // Shrawan 2083 as weeks, Sunday first
```

Every method returns a new date. See [docs/arithmetic.md](docs/arithmetic.md)
for how months are clamped and differences counted.

### Formatting and parsing

```ts
const date = BsDate.of(2083, 4, 1);
date.format('D MMMM YYYY, dddd'); // '1 Shrawan 2083, Friday'
date.format('D MMMM YYYY, dddd', { locale: 'ne' }); // '१ साउन २०८३, शुक्रवार'

BsDate.parse('2083-04-01'); // default pattern YYYY-MM-DD
BsDate.parse('१ साउन २०८३', 'D MMMM YYYY'); // Devanagari digits and names
BsDate.parse('1 Saun 2083', 'D MMMM YYYY'); // common spellings
```

Parsing is strict about structure and forgiving about spelling. It accepts
ASCII or Devanagari digits and English or Nepali names in any common
spelling, and it checks any weekday in the string against the date. See
[docs/formatting.md](docs/formatting.md) for the tokens.

### Instants and Kathmandu time

A `Date` (or a database timestamp) is an instant, which falls on different
dates in different time zones. BS dates are read in **Kathmandu time**,
whatever the server's time zone:

```ts
import { BsDate } from 'bikram-sambat-date';

BsDate.fromInstant(new Date('2026-07-16T18:15:00Z')).toString(); // '2083-04-01'
BsDate.today(); // today in Kathmandu
BsDate.of(2083, 4, 1).toInstant(); // 2026-07-16T18:15:00.000Z, midnight in Kathmandu
```

### Fiscal year

Nepal's fiscal year runs from 1 Shrawan to the last day of Asar:

```ts
import { FiscalYear, fiscalYearOf } from 'bikram-sambat-date';

fiscalYearOf(new Date()).label; // '2083/84'
const fy = FiscalYear.parse('2083/84');
fy.firstDay.toString(); // '2083-04-01'
fy.contains(BsDate.of(2084, 3, 1)); // true
fy.next().label; // '2084/85'
```

See [docs/time-and-fiscal-year.md](docs/time-and-fiscal-year.md) for
Kathmandu's clock history and querying records by BS day.

### NestJS

```ts
import { IsBsDate, ParseBsDatePipe, ToBsDate } from 'bikram-sambat-date/nestjs';

class SalesReportQueryDto {
  @ToBsDate() // '2083-04-01' → BsDate (ValidationPipe with transform: true)
  @IsBsDate() // otherwise 400: "from must be a BS date (YYYY-MM-DD)"
  from!: BsDate;
}

@Get('sales/:date')
salesOn(@Param('date', ParseBsDatePipe) date: BsDate) {}
```

The NestJS helpers live in a separate entry point. `@nestjs/common`,
`class-validator` and `class-transformer` are optional peer dependencies,
so the core stays dependency-free. See [docs/nestjs.md](docs/nestjs.md).

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
supportedRange(); // { published, projected }: first and last dates of each, in BS and AD
```

### Projected dates

Dates after the last published calendar (BS 2083) convert normally. Each
`BsDate` says how far it can be trusted:

```ts
import { adToBs, BsDate } from 'bikram-sambat-date';

BsDate.of(2083, 6, 27).confidence; // 'published'

const later = adToBs({ year: 2035, month: 1, day: 1 });
later.isProjected; // true
later.confidence; // 'projected' or 'uncertain'
```

| `confidence` | Meaning                                                          |
| ------------ | ---------------------------------------------------------------- |
| `published`  | From a published calendar.                                       |
| `projected`  | Computed. On the published years, such months were always right. |
| `uncertain`  | Computed, but the month could start or end a day off.            |

Where only published dates will do, such as legal or tax documents, pass
`{ strict: true }`. Projected dates then throw `ProjectedDateError`:

```ts
adToBs({ year: 2035, month: 1, day: 1 }, { strict: true }); // throws ProjectedDateError
BsDate.of(2090, 1, 1, { strict: true }); // throws ProjectedDateError
```

### Errors

| Error                 | When                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| `DateOutOfRangeError` | The date is outside the supported range.                                      |
| `ProjectedDateError`  | With `{ strict: true }`: the date is projected, not published.                |
| `InvalidDateError`    | The date does not exist, such as 32 Baisakh 2083 or 30 February.              |
| `DateParseError`      | A string is not in the expected format, such as `BsDate.parse('2083/04/01')`. |

All extend `BikramSambatError`. `ProjectedDateError` also extends
`DateOutOfRangeError`, so code that handles out-of-range dates handles it
too.

```ts
import { BikramSambatError, BsDate } from 'bikram-sambat-date';

try {
  BsDate.of(year, month, day);
} catch (error) {
  if (!(error instanceof BikramSambatError)) throw error;
  // a bad or unsupported date: reject the request with a 400
}
```

## Supported range

|               | BS                       | AD                       |
| ------------- | ------------------------ | ------------------------ |
| **Published** | 1975-01-01 to 2083-12-30 | 1918-04-13 to 2027-04-13 |
| **Projected** | 2084-01-01 to 2200-12-31 | 2027-04-14 to 2144-04-15 |

Each newly published year moves from projected to published in a release;
see
[adding a year](docs/data-sources.md#adding-a-year-when-a-new-calendar-is-published).
Keep the package up to date so that dates in the coming year are
`published`.

## Roadmap

1. **Foundation (done):** cross-checked table, conversion and `BsDate`.
2. **Projected range (done):** Sūrya Siddhānta month starts through BS
   2200, with `confidence` and `{ strict: true }`.
3. **Kathmandu time and fiscal year (done):** `fromInstant`, `today`,
   `toInstant`, and `FiscalYear`.
4. **Formatting and parsing (done):** `format` and `BsDate.parse` with
   English and Nepali names and Devanagari digits.
5. **Arithmetic (done):** add and diff days, months and years; month and
   year boundaries; `monthGrid`.
6. **NestJS helpers (done):** `@IsBsDate()`, `@ToBsDate()` and
   `ParseBsDatePipe` in `bikram-sambat-date/nestjs`.
7. **Release readiness (done):** CI on Node 22, 24 and 26; package checks;
   [RELEASING.md](RELEASING.md).

## Development

```sh
npm install
npm run check          # typecheck, lint, format, data up to date, tests
npm run test:tz        # tests under several time zones
npm run build          # dist/: ESM, CommonJS and type definitions
npm run check:package  # publint and are-the-types-wrong
npm run data:build     # rebuild the calendar table from data/
npm run data:calibrate # score the projection against published years
```

[RELEASING.md](RELEASING.md) covers releases, including the yearly one that
publishes a new calendar year.

- [docs/architecture.md](docs/architecture.md) explains how conversion works
  and how the code is laid out.
- [docs/data-sources.md](docs/data-sources.md) explains where the calendar
  data comes from and how to update it.
- [docs/projection.md](docs/projection.md) explains how years after the
  published calendars are computed, and how accurate that is.
- [docs/time-and-fiscal-year.md](docs/time-and-fiscal-year.md) explains
  instants, Kathmandu time and the fiscal year.
- [docs/formatting.md](docs/formatting.md) lists the format tokens and how
  parsing reads strings.
- [docs/arithmetic.md](docs/arithmetic.md) explains adding and comparing
  dates, and month grids.
- [docs/nestjs.md](docs/nestjs.md) covers validation, transformation, the
  pipe, and how to store BS dates.

## License

MIT. The calendar data draws on the open-source projects listed in
[NOTICE](NOTICE).
