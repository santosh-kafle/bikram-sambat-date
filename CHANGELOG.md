# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Calendar table** for BS 1975–2083 (AD 1918-04-13 to 2027-04-13).
  - It cross-checks six open-source month-length tables against Hamro Patro.
  - Every disputed year has a recorded decision, and the build fails on any
    new disagreement.
- **Data tooling:**
  - `npm run data:build` builds the table and `data/REPORT.md`;
  - `npm run data:fetch-hamropatro` refreshes the reference snapshot.
- **Conversion:** `adToBs` and `bsToAd`. They use integer day numbers, so
  results do not depend on the server time zone.
- **`BsDate`:** an immutable date with:
  - 1-based months;
  - `weekday`, `toAd()`, `equals`, `isBefore`, `isAfter` and `compare`;
  - `"YYYY-MM-DD"` output from `toString()` and `toJSON()`.
- **Calendar helpers:** `daysInBsMonth`, `daysInBsYear`, `isValidBsDate`,
  `supportedRange`, `BS_MIN_YEAR` and `BS_MAX_YEAR`.
- **Errors:** `BikramSambatError`, with the subclasses `DateOutOfRangeError`
  and `InvalidDateError`.
- **Builds:** ESM and CommonJS, with TypeScript types.
