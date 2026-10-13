# Instants, Kathmandu time and the fiscal year

## Calendar dates versus instants

A `BsDate` is a calendar date: a day, with no time and no time zone. A
JavaScript `Date`, a database `timestamptz` or a Unix timestamp is an
**instant**: a point in time, which falls on different calendar dates in
different places. 2026-07-16T18:15:00Z is still 16 July in London, but
already 17 July (1 Shrawan 2083) in Kathmandu.

BS dates are Nepali dates, so this library always reads instants in
**Kathmandu time**, whatever the server's time zone:

```ts
import { BsDate } from 'bikram-sambat-date';

const placed = new Date('2026-07-16T18:15:00Z'); // e.g. order.createdAt
BsDate.fromInstant(placed).toString(); // '2083-04-01', on any server
BsDate.today(); // today's date in Kathmandu
```

`fromInstant` takes a `Date` or milliseconds since the Unix epoch.

To go the other way, `toInstant()` gives the instant a day begins in
Kathmandu. Use it to query records by BS day:

```ts
const day = BsDate.of(2083, 4, 1);
const from = day.toInstant(); // 2026-07-16T18:15:00.000Z
const to = BsDate.of(2083, 4, 2).toInstant(); // exclusive upper bound
// SELECT … WHERE created_at >= $from AND created_at < $to
```

## Kathmandu's clock history

Nepal has never used daylight saving time, but its offset from UTC has
changed twice:

| Period    | Offset   | Note                                                        |
| --------- | -------- | ----------------------------------------------------------- |
| to 1919   | +5:41:16 | Local mean time                                             |
| 1920–1985 | +5:30    | On 1 January 1920 the clock went back 11 minutes 16 seconds |
| from 1986 | +5:45    | On 1 January 1986 the clock skipped 00:00–00:15             |

The library applies these offsets itself (`src/core/kathmandu.ts`), without
depending on the runtime's time zone data. The test suite checks them
against that data (the IANA `Asia/Kathmandu` zone) across the whole
supported range. Because the first quarter hour of 1 January 1986 never
happened, `toInstant()` for that day gives 00:15, the first moment that
existed.

## The fiscal year

Nepal's fiscal year (_arthik barsa_) runs from **1 Shrawan** to the **last
day of Asar** of the next BS year. Fiscal year 2083/84 runs from 1 Shrawan
2083 (17 July 2026) to the last day of Asar 2084. Invoice and receipt series
usually restart with each fiscal year.

```ts
import { FiscalYear, fiscalYearOf } from 'bikram-sambat-date';

fiscalYearOf(new Date()).label; // '2083/84'

const fy = FiscalYear.parse('2083/84'); // or FiscalYear.of(2083)
fy.startYear; // 2083
fy.endYear; // 2084
fy.firstDay.toString(); // '2083-04-01'
fy.firstDay.toInstant(); // 2026-07-16T18:15:00.000Z, midnight in Kathmandu
fy.lastDay.toAd(); // the last day of Asar 2084, in AD
fy.contains(BsDate.of(2084, 1, 1)); // true
fy.next().label; // '2084/85'
JSON.stringify({ fy }); // '{"fy":"2083/84"}'
```

- `fiscalYearOf(x)` is shorthand for `FiscalYear.containing(x)`. Both take a
  `BsDate`, a `Date` or epoch milliseconds, and read instants in Kathmandu
  time. A fiscal year therefore starts at midnight on 1 Shrawan in
  Kathmandu.
- Labels use two digits for the end year and wrap at the century:
  `2099/00`. `FiscalYear.parse` also accepts `2083/2084`. It throws
  `DateParseError` for anything else, including years that are not
  consecutive.
- Fiscal years 1975/76 to 2199/00 are supported. Outside that range a fiscal
  year would have days outside the table, so it throws
  `DateOutOfRangeError`.
- The current fiscal year usually ends in a projected year (2083/84 ends in
  Asar 2084), so its `lastDay` can have a `confidence` other than
  `published`. Pass `{ strict: true }` when reading an instant to reject
  projected dates. A `FiscalYear` itself is never strict, so it can always
  span the current year.
