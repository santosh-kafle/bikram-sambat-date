# Formatting and parsing

```ts
import { BsDate } from 'bikram-sambat-date';

const date = BsDate.of(2083, 4, 1);
date.format('D MMMM YYYY, dddd'); // '1 Shrawan 2083, Friday'
date.format('D MMMM YYYY, dddd', { locale: 'ne' }); // '१ साउन २०८३, शुक्रवार'

BsDate.parse('2083-04-01'); // the default pattern is YYYY-MM-DD
BsDate.parse('१ साउन २०८३', 'D MMMM YYYY');
BsDate.parse('1 Saun 2083', 'D MMMM YYYY');
```

`toString()` and `toJSON()` always give `YYYY-MM-DD` in ASCII digits, the
form to store and exchange. Use `format` for display.

## Tokens

| Token  | English    | Nepali (`ne`) | Meaning                  |
| ------ | ---------- | ------------- | ------------------------ |
| `YYYY` | `2083`     | `२०८३`        | Year                     |
| `YY`   | `83`       | `८३`          | Year, last two digits    |
| `MMMM` | `Shrawan`  | `साउन`        | Month name               |
| `MMM`  | `Shr`      | `साउन`        | Short month name         |
| `MM`   | `04`       | `०४`          | Month, two digits        |
| `M`    | `4`        | `४`           | Month                    |
| `DD`   | `01`       | `०१`          | Day, two digits          |
| `D`    | `1`        | `१`           | Day                      |
| `dddd` | `Friday`   | `शुक्रवार`    | Weekday name             |
| `ddd`  | `Fri`      | `शुक्र`       | Short weekday name       |
| `d`    | `5`        | `५`           | Weekday, 0 (Sunday) to 6 |
| `[…]`  | text as is | text as is    | Literal text             |

Any other character is copied as it is. Put letters that would otherwise be
tokens in brackets: `[Date:] YYYY-MM-DD`.

With `{ locale: 'ne' }`, numbers are written in Devanagari digits.
`toDevanagariDigits` and `toAsciiDigits` convert other strings.

### Names

| #   | English | Nepali |     | #   | English | Nepali  |
| --- | ------- | ------ | --- | --- | ------- | ------- |
| 1   | Baisakh | वैशाख  |     | 7   | Kartik  | कार्तिक |
| 2   | Jestha  | जेठ    |     | 8   | Mangsir | मंसिर   |
| 3   | Asar    | असार   |     | 9   | Poush   | पुष     |
| 4   | Shrawan | साउन   |     | 10  | Magh    | माघ     |
| 5   | Bhadra  | भदौ    |     | 11  | Falgun  | फागुन   |
| 6   | Asoj    | असोज   |     | 12  | Chaitra | चैत     |

The Nepali names are those Hamro Patro shows. The English ones use the
romanization most common in Nepali English-language media. Weekdays are
आइतवार, सोमवार, मंगलवार, बुधवार, बिहिवार, शुक्रवार and शनिवार.

## Parsing

`BsDate.parse(text, pattern?, options?)` reads a string with the same tokens.
It is strict about structure and forgiving about spelling:

- **Digits** may be ASCII or Devanagari.
- **Month and weekday names** match in any case and in either language,
  whatever the locale. They also match common alternative spellings, such
  as _Baishakh_, _Saun_, _Ashwin_, _Paush_, श्रावण, चैत्र and आइतबार. The
  full list is `MONTH_ALIASES` and `WEEKDAY_ALIASES` in `src/locale.ts`.
  `MMM` and `MMMM` accept the same names.
- **Whitespace:** leading and trailing whitespace is ignored, and a space in
  the pattern matches any run of whitespace.
- **Everything else must match exactly.** `MM` and `DD` need two digits;
  use `M` and `D` for one or two. A string with extra text is rejected.
- **A weekday in the pattern is checked.** `1 Shrawan 2083, Monday` is
  rejected, because 1 Shrawan 2083 is a Friday.

The pattern needs a year (`YYYY`), month and day. `YY` cannot be parsed,
because its century would be a guess.

| Error                 | When                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `DateParseError`      | The string does not match the pattern, or names the wrong weekday.    |
| `InvalidDateError`    | It matches, but the date does not exist, such as `2083-01-32`.        |
| `DateOutOfRangeError` | The year is outside the supported range.                              |
| `ProjectedDateError`  | With `{ strict: true }`, the year is projected rather than published. |

All four extend `BikramSambatError`. An API can therefore answer a bad date
with a 400 by catching just that class.
