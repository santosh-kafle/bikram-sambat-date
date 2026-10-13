# Calendar data: where it comes from and how it is checked

## Why a table at all

Bikram Sambat months are solar months. Each one starts on the day the Sun
enters the next sign of the sidereal zodiac (its _saṅkrānti_), which makes
months 29 to 32 days long. The official dates are set by the **Nepal
Panchanga Nirnayak Samiti**, using the Sūrya Siddhānta model of the Sun's
motion. They are published only about a year ahead, in the approved
calendars (_patro_).

No simple formula reproduces those dates. Every BS converter, this one
included, therefore stores a table of month lengths. The table is only as
good as its data, so this project treats the data as a first-class part of
the code.

## Inputs

| Path                              | What it is                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `data/sources/`                   | Month-length tables from six open-source projects, kept byte for byte as published, each next to its upstream `LICENSE`. |
| `data/sources/manifest.json`      | Provenance for each source: repository, commit, upstream path, license, retrieval date and file format.                  |
| `data/references/hamropatro.json` | The month lengths and Gregorian start dates [Hamro Patro](https://www.hamropatro.com) shows, BS 2000 onward.             |
| `data/calendar.config.json`       | The year range, the anchor date, and a written decision for every year the sources disagree on.                          |

The sources are listed in [`NOTICE`](../NOTICE). They are not independent:
projects copy each other, and `ashok095/bikram-sambat` states that it was
built partly from `nepali-datetime`. A majority vote among them is
therefore not proof. In BS 2062, four sources agree with each other and are
wrong, while Hamro Patro and the other two are right.

## How the table is built

`npm run data:build` runs `scripts/build-calendar.ts`. For each year from
`minYear` to `maxYear` it takes the month lengths from:

1. **Hamro Patro**, when the reference has all twelve months of the year;
2. otherwise the **source tables**, when at least two cover the year and all
   that cover it agree;
3. otherwise the source named in **`resolutions`** in
   `data/calendar.config.json`, with a written reason.

The build **fails** if:

- the sources disagree on a year that has neither reference data nor a
  resolution;
- a resolution exists for a year that no longer needs one;
- a month falls outside 29–32 days, or a year outside 365–366 days;
- any month start Hamro Patro records differs from the table.

It then places the table on the calendar using the anchor
(1 Baisakh 2083 = 14 April 2026), and writes:

- `src/data/calendar.generated.ts`, the table the library ships;
- [`data/REPORT.md`](../data/REPORT.md), which records the agreement of each
  source, every disputed year and its decision, and the projected years
  beyond the table.

`npm run data:build -- --check` verifies both outputs are up to date
without writing them.

## Range: BS 1975–2083

- **Start, 1975.** This is where most sources begin. Hamro Patro has no
  pages before 2000. Seven years before 2000 (1975, 1977, 1981, 1989, 1991,
  1993, 1998) were decided by hand from the sources; see the report. 1993
  and 1998 are marked low confidence.
- **End, 2083.** This is the latest year with a published calendar. Every
  source, Hamro Patro included, lists later years, but those are
  projections. They disagree with each other by up to two days on New
  Year's Day. Hamro Patro even gives BS 2087 an impossible 367 days and
  starts 2088 on 16 April 2031, when the Sun enters Aries around 14 April.
- **Past projections were wrong.** The source projects' own histories show
  it: `nepali-datetime`, Medic's `bikram-sambat` and `subeshb1/Nepali-Date`
  each had to correct 2081, 2082 or 2083 once the official calendar
  appeared. Tables published in 2019–2020 had 10 of the 84 month starts in
  2077–2083 wrong.

Rather than ship such guesses as fact, the library throws
`DateOutOfRangeError` past 2083. A Sūrya Siddhānta projection for later
years, clearly marked as projected, is planned for the next release. In a
backtest on 2077–2083 it got 81 of 84 month starts right, as good as the
best table updated a year before.

## Adding a year when a new calendar is published

The Samiti approves each year's calendar a few months before Baisakh. When
it is out:

1. Run `npm run data:fetch-hamropatro -- <year>` to refresh the reference.
2. Raise `maxYear` in `data/calendar.config.json`.
3. Run `npm run data:build`. If the sources disagree with the reference, the
   reference wins, and the report lists which sources differ.
4. Check a few dates against the printed patro or another trusted calendar.
5. Run `npm test`, then release.

To refresh a source table, update its file and its `commit` and `retrieved`
fields in the manifest, then rebuild.
