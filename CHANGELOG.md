# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Releases are published by GitHub Actions with npm trusted publishing, so
  each version carries a provenance statement linking it to the commit it
  was built from.

## [0.1.0] - 2026-10-13

First release.

### Added

- **Conversion** between Bikram Sambat and Gregorian dates.
  - `adToBs` and `bsToAd`.
  - `BsDate`, an immutable date with 1-based months. It provides `of`,
    `fromAd`, `toAd`, `weekday`, `equals`, `isBefore`, `isAfter` and
    `compare`, and its `toString()`/`toJSON()` give `"YYYY-MM-DD"`.
  - Conversions use integer day numbers, never a JavaScript `Date`, so
    results do not depend on the server's time zone.
- **Published calendar table, BS 1975–2083** (AD 1918-04-13 to 2027-04-13).
  - It is built by cross-checking six open-source month-length tables
    against Hamro Patro.
  - All 1,008 month starts from 2000 to 2083 match Hamro Patro.
  - Every disputed year has a written decision; see `data/REPORT.md` and
    `docs/data-sources.md`.
- **Projected years, BS 2084–2200** (to AD 2144-04-15).
  - They are computed at build time with the Sūrya Siddhānta and Nepal's
    month rule: a month starts on the civil day of its saṅkrānti, with the
    puṇya-kāla exceptions for Shrawan and Magh. The package ships no
    astronomy code.
  - Measured on the published years, the projection gets 1,297 of 1,308
    month starts right (99.2%). Every miss falls in a month flagged
    uncertain; see `data/ACCURACY.md` and `docs/projection.md`.
  - `BsDate.confidence` (`'published' | 'projected' | 'uncertain'`) and
    `BsDate.isProjected` say how far a date can be trusted.
  - `{ strict: true }` on `BsDate.of`, `fromAd`, `fromInstant`, `parse`,
    `adToBs` and `bsToAd` rejects projected dates with
    `ProjectedDateError`.
- **Kathmandu time.**
  - `BsDate.fromInstant(date | epochMs)`, `BsDate.today()` and
    `BsDate#toInstant()` read instants in Asia/Kathmandu, whatever the
    server's time zone.
  - They follow Kathmandu's historical UTC offsets: +5:41:16, then +5:30
    from 1920, then +5:45 from 1986.
- **Fiscal year.**
  - `FiscalYear` (`of`, `parse`, `containing`, `contains`, `next`,
    `previous`, `label`, `firstDay`, `lastDay`) and `fiscalYearOf`.
  - A fiscal year runs from 1 Shrawan to the last day of Asar. Fiscal years
    1975/76–2199/00 are supported.
- **Formatting and parsing.**
  - `BsDate#format(pattern?, { locale })`, with tokens
    `YYYY YY MMMM MMM MM M DD D dddd ddd d` and `[literal]`.
  - Locales `en` and `ne`. `ne` uses Devanagari digits and the month and
    weekday names Hamro Patro shows.
  - `BsDate.parse(text, pattern?)` is strict about structure. It accepts
    ASCII or Devanagari digits and English or Nepali names in common
    spellings, and checks any weekday in the string against the date.
  - `toDevanagariDigits` and `toAsciiDigits`.
- **Arithmetic.**
  - `addDays`, `addMonths` and `addYears` (month and year additions clamp
    to the end of a shorter month).
  - `diffInDays`, `diffInMonths` and `diffInYears`, which can be used for
    ages.
  - `startOfMonth`, `endOfMonth`, `startOfYear` and `endOfYear`.
  - `daysInMonth`, `daysInYear` and `dayOfYear`.
  - `monthGrid(year, month, { weekStartsOn })` lays a month out in weeks.
- **Calendar helpers:** `daysInBsMonth`, `daysInBsYear`, `isValidBsDate`,
  `supportedRange()` (published and projected ranges), `BS_MIN_YEAR`,
  `BS_LAST_PUBLISHED_YEAR` and `BS_MAX_YEAR`.
- **Errors:** `BikramSambatError`, with the subclasses `DateOutOfRangeError`,
  `ProjectedDateError`, `InvalidDateError` and `DateParseError`.
- **NestJS helpers** in `bikram-sambat-date/nestjs`.
  - `@IsBsDate()` and `isBsDate` validate BS dates.
  - `@ToBsDate()` converts DTO strings to `BsDate` and back, and works with
    `enableImplicitConversion`.
  - `ParseBsDatePipe` parses route and query parameters and answers
    400 Bad Request for a bad date.
  - `@nestjs/common`, `class-validator` and `class-transformer` are
    optional peer dependencies.
- **Packaging.**
  - ESM and CommonJS builds with TypeScript types. The types also resolve
    under `"moduleResolution": "node"`.
  - No runtime dependencies; the core is about 10 KB gzipped.
  - Requires Node.js 22 or newer.

[Unreleased]: https://github.com/santosh-kafle/bikram-sambat-date/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/santosh-kafle/bikram-sambat-date/releases/tag/v0.1.0
