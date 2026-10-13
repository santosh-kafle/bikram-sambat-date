# NestJS

`bikram-sambat-date/nestjs` validates, transforms and parses BS dates in
NestJS applications. It needs `@nestjs/common`, `class-validator` and
`class-transformer`. They are optional peer dependencies, so the core
package never installs them.

```ts
import { IsBsDate, ParseBsDatePipe, ToBsDate } from 'bikram-sambat-date/nestjs';
```

## Validating a DTO field: `@IsBsDate()`

```ts
class CreateInvoiceDto {
  @IsBsDate()
  issuedOn!: string; // '2083-04-01'
}
```

A value that is not a BS date fails validation with
`issuedOn must be a BS date (YYYY-MM-DD)`.

| Option    | Default      | Meaning                                                  |
| --------- | ------------ | -------------------------------------------------------- |
| `pattern` | `YYYY-MM-DD` | The [format pattern](formatting.md) strings must match.  |
| `strict`  | `false`      | Reject projected dates; accept only published calendars. |

The second argument is class-validator's usual `ValidationOptions`, such as
`{ each: true }` for arrays or a custom `message`. Strings are read as
`BsDate.parse` reads them: Devanagari digits and common month spellings are
fine.

`isBsDate(value, options)` is the same check as a plain function.

## Getting `BsDate` values: `@ToBsDate()`

With `ValidationPipe({ transform: true })`, `@ToBsDate()` turns the
string into a `BsDate`. Put it before `@IsBsDate()`:

```ts
class SalesReportQueryDto {
  @ToBsDate()
  @IsBsDate()
  from!: BsDate;

  @IsOptional()
  @ToBsDate()
  @IsBsDate()
  to?: BsDate;
}

@Get('reports/sales')
sales(@Query() query: SalesReportQueryDto) {
  query.from.toInstant(); // query.from is a BsDate
}
```

- A string that does not parse is left as it is, so `@IsBsDate()` reports
  it.
- Arrays are converted element by element; validate them with
  `@IsBsDate({}, { each: true })`.
- On the way out, `ClassSerializerInterceptor` (`instanceToPlain`) turns the
  `BsDate` back into a string in the same pattern. Without the interceptor,
  `BsDate#toJSON` gives `YYYY-MM-DD` anyway.
- It works with `transformOptions: { enableImplicitConversion: true }`. That
  setting would otherwise try to convert the string to the `BsDate` type
  itself; `@ToBsDate()` reads the original input instead.
- Give `@ToBsDate()` the same `pattern` as `@IsBsDate()` if you change it.

Typing a property as `BsDate` without `@ToBsDate()` does not work: nothing
converts the string.

## Route and query parameters: `ParseBsDatePipe`

```ts
@Get('sales/:date')
salesOn(@Param('date', ParseBsDatePipe) date: BsDate) {}

@Get('sales')
list(
  @Query('from', new ParseBsDatePipe({ optional: true })) from?: BsDate,
  @Query('fy-start', new ParseBsDatePipe({ strict: true })) start: BsDate,
) {}
```

A value that is not a BS date gets a 400 Bad Request:
`Validation failed (BS date YYYY-MM-DD is expected): …`, followed by the
library's explanation.

| Option     | Default      | Meaning                                               |
| ---------- | ------------ | ----------------------------------------------------- |
| `pattern`  | `YYYY-MM-DD` | The [format pattern](formatting.md) to parse with.    |
| `strict`   | `false`      | Reject projected dates.                               |
| `optional` | `false`      | Pass a missing or empty value through as `undefined`. |

## Responses and storage

`BsDate` serializes to `"YYYY-MM-DD"`, so it can be returned from
controllers as it is. For a database, store either:

- **the instant**, such as a `timestamptz` column, and derive BS dates with
  `BsDate.fromInstant`. This is best when the time of day matters, such as
  for orders and payments;
- **the BS date string** (`YYYY-MM-DD`), when the BS date itself is the
  record, such as a date of birth entered in BS. Sorting the strings sorts
  the dates.

A projected date can change by a day when its year is published. Prefer
storing instants or AD dates for future events, and derive BS for display.
