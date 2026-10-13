# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Projected years** BS 2084–2200 (AD 2027-04-14 to 2144-04-15).
  - They are computed at build time with the Sūrya Siddhānta and Nepal's month
    rule: the civil day of the saṅkrānti, with the puṇya-kāla exceptions for
    Shrawan and Magh.
  - On the published years the projection gets 1,297 of 1,308 month starts
    right (99.2%).
  - The engine ships no code in the package.
- **`BsDate.confidence`** (`'published' | 'projected' | 'uncertain'`) and
  `BsDate.isProjected`.
- **`{ strict: true }`** on `BsDate.of`, `BsDate.fromAd`, `adToBs` and
  `bsToAd`. It rejects projected dates with the new `ProjectedDateError`,
  which extends `DateOutOfRangeError`.
- **`BS_LAST_PUBLISHED_YEAR`**, and the types `DateConfidence`,
  `ConversionOptions` and `DateRange`.
- **`npm run data:calibrate`** scores the projection against the published
  years and writes `data/ACCURACY.md`.
- **Docs:** `docs/projection.md`.
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

### Changed

- `BS_MAX_YEAR` is now 2200, the end of the projected range.
- `supportedRange()` returns `{ published, projected }`, each with `bs` and
  `ad` bounds.
