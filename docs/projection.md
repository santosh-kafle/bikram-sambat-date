# Projected years: how dates after the published calendars are computed

The Nepal Panchanga Nirnayak Samiti publishes each year's calendar only a
few months before it begins. The latest published year is BS 2083. Every
date after that has to be projected, by this library or by anyone else.
Hamro Patro and other converters project too; they just don't say so.

This library projects BS 2084–2200 (AD 2027–2144) from the same astronomy
the Samiti uses. It calibrates the projection against 1,308 published months
and marks every projected date with a `confidence`.

## The astronomy

A BS month begins at a _saṅkrānti_, the moment the Sun enters the next sign
of the sidereal zodiac. Baisakh begins at Mesha (0°), Jestha at Vrishabha
(30°), and so on. The Samiti computes the Sun's position by the **Sūrya
Siddhānta**, the classical Indian astronomical text, not by modern
astronomy.

The engine (`scripts/astro/surya-siddhanta.ts`) uses the Sūrya Siddhānta's
true Sun:

- **Mean motion:** 4,320,000 sidereal revolutions in 1,577,917,828 days, a
  sidereal year of 365.258756 days.
- **Epoch:** the Kali Yuga epoch, mean midnight at Ujjain (75.7683° E) on 18
  February 3102 BCE.
- **Equation of centre:** the _manda_ correction, with the apogee at 77°17′
  and an epicycle of 14° that shrinks to 13°40′ at quadrature.

These are the parameters of OSN.NepaliCalendar's model of the Samiti's
panchang, which reproduces its published tithis. A second variant, from
Reingold and Dershowitz's _Calendrical Calculations_ (classical sine table,
moving apogee), is kept for comparison. The two agree to within a few
minutes.

## The month rule

Where a saṅkrānti falls relative to a day boundary decides which civil day
the month starts on. Matching the engine against every published month
gives this rule:

1. **Normally**, a month starts on the civil day (midnight to midnight,
   Nepal Standard Time) on which its saṅkrānti falls, at any hour.
2. **Shrawan** (Karka saṅkrānti) starts **the day before** when the saṅkrānti
   comes after midnight but before Kathmandu sunrise.
3. **Magh** (Makara saṅkrānti) starts **the day after** when the saṅkrānti
   comes after Kathmandu sunset.

Rules 2 and 3 are the classical _puṇya-kāla_ rule of the dharmaśāstra. The
holy period of the Karka saṅkrānti, the Sun's turn south, is taken before
the moment. That of the Makara saṅkrānti, the turn north, is taken after
it. A Karka saṅkrānti in the small hours therefore belongs to the previous
day, and a Makara saṅkrānti in the evening to the next.

Before these two exceptions were found, the engine matched about 95% of
published month starts. Its misses clustered in Shrawan and Magh, with
sharp cut-offs at sunrise and at sunset. With the exceptions it matches
99.2%.

India's solar calendars apply the same saṅkrāntis with other rules: Tamil
by sunset, Bengali by midnight then the next day, Malayalam by the
afternoon. Odia, like Nepal, uses any hour. Most Indian almanacs also
compute with modern astronomy. Their dates therefore cannot stand in for
Nepal's. India's _Vikram Samvat_, which shares the year number, is
lunisolar rather than solar.

## Calibration

`npm run data:calibrate` runs the engine over every published month and
writes [data/ACCURACY.md](../data/ACCURACY.md). The parameters in use are in
`projection` in `data/calendar.config.json`:

| Parameter                | Value          | Why                                                                                                                                                                                                                               |
| ------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`                  | `fixed-apogee` | As accurate as the alternative, and simpler.                                                                                                                                                                                      |
| `offsetMinutes`          | −10            | Offsets from −16 to −4 minutes all do better than none, both on BS 2000–2083 and on 1975–1999, which played no part in finding the rule. −10 is the middle of that range, rather than its single best point, which could be luck. |
| `uncertainMarginMinutes` | 30             | Every miss lies within 22 minutes of a boundary.                                                                                                                                                                                  |

Results on the published calendars:

| Months                           | Correct                 |
| -------------------------------- | ----------------------- |
| BS 2000–2083                     | 999 / 1008 (99.1%)      |
| BS 1975–1999 (never used to fit) | 298 / 300 (99.3%)       |
| **All**                          | **1297 / 1308 (99.2%)** |

## Confidence

Each projected month start lies some distance from the nearest boundary of
the rule. If that distance is under 30 minutes, a small difference between
this engine and the Samiti's computation could move the month by a day.
Such starts are listed in `UNCERTAIN_MONTH_STARTS` in the generated table.
On the published years they are about 5% of months, and they include every
month the engine got wrong.

`BsDate.confidence` is one of:

| Value       | Meaning                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `published` | The year's calendar has been published.                                                                                                   |
| `projected` | Projected, and neither this month's start nor the next month's is near a boundary. On the published years, such months were always right. |
| `uncertain` | Projected, and this month's start or the next month's could move by a day. That would shift some of the month's dates by a day.           |

Pass `{ strict: true }` to accept published dates only. Projected dates then
throw `ProjectedDateError`.

## When a new year is published

The projection gives way to published data. When the Samiti publishes a
year, the steps in
[adding a year](data-sources.md#adding-a-year-when-a-new-calendar-is-published)
move it into the published table. Then:

1. `npm run data:build` projects only the years after it.
2. `npm run data:calibrate` re-scores the engine with one more year of
   evidence. A new miss outside the margin fails the run, which is the
   signal to revisit the parameters.

## How it is built

The engine is used only by the build scripts (`scripts/astro/`) and never
ships in the package. `npm run data:build` writes the projected years into
`src/data/calendar.generated.ts`, next to the published ones. The build
fails unless:

- the first projected day follows the last published one;
- every month has 29–32 days and every year 365 or 366;
- every New Year's Day is within a day of where the mean sidereal year puts
  it.

New Year's Day drifts later over the centuries because the sidereal year is
longer than the Gregorian one. It reaches 16 April after AD 2100, when the
Gregorian calendar also skips a leap day.

## Credits

- Edward M. Reingold and Nachum Dershowitz, _Calendrical Calculations_,
  for the Hindu solar calendar algorithms.
- [OSN.NepaliCalendar](https://github.com/Unicodist/OSN.NepaliCalendar)
  (MIT), for the Sūrya Siddhānta parameters of the Samiti's panchang.
- The observation that Nepal's months follow the saṅkrānti's civil day under
  the Sūrya Siddhānta, checked against Nepal Rajpatra holiday notices:
  [kitsuyui/hyper-calendar#95](https://github.com/kitsuyui/hyper-calendar/pull/95).
