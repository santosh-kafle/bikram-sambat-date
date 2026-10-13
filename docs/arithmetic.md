# Date arithmetic

Every method returns a new `BsDate`; dates are immutable. All arithmetic
works on day numbers, so it never depends on the server's time zone.

```ts
import { BsDate, monthGrid } from 'bikram-sambat-date';

const date = BsDate.of(2083, 3, 32); // 32 Asar 2083

date.addDays(1); // 2083-04-01
date.addMonths(1); // 2083-04-31: Shrawan has 31 days, so the day is clamped
date.addYears(1); // 2084-03-31
date.addDays(-7); // a week earlier

BsDate.of(2083, 4, 1).diffInDays(date); // 1
BsDate.today().diffInYears(BsDate.of(2050, 6, 28)); // an age in BS years

date.startOfMonth(); // 2083-03-01
date.endOfMonth(); // 2083-03-32
date.startOfYear(); // 2083-01-01
date.endOfYear(); // 2083-12-30
date.daysInMonth; // 32
date.daysInYear; // 365
date.dayOfYear; // 94
```

## Months and years

BS months have 29 to 32 days, so adding months needs a rule for days that do
not exist in the target month. `addMonths` keeps the day of the month and
**clamps** it to the target month's last day when needed. 32 Asar plus one
month is 31 Shrawan. `addYears(n)` is `addMonths(12 * n)`.

Clamping means that adding a month and then subtracting one does not always
get back to the start: 32 Asar, plus one month, minus one month, is 31 Asar.
The differences are defined to match:

- `a.diffInMonths(b)` is the number of whole months from `b` to `a`: the
  largest `n` for which `b.addMonths(n)` is not after `a`. Therefore
  `x.addMonths(n).diffInMonths(x) === n` for every `n`.
- `a.diffInYears(b)` is whole years, `diffInMonths` divided by 12 and rounded
  towards zero. It works for ages: on 27 Asoj 2083, someone born on 28 Asoj
  2050 is 32, and someone born on 27 Asoj 2050 is 33.
- `a.diffInDays(b)` is exact.

All three are positive when `a` is later than `b`.

## Ranges and errors

- A result outside the supported range (BS 1975–2200) throws
  `DateOutOfRangeError`.
- A result can fall in a projected year. Check its `confidence` when that
  matters.
- Amounts must be integers; anything else throws `RangeError`.

## Month grids

`monthGrid(year, month, options?)` lays out a month as on a wall calendar:
four to six weeks of seven days. Days from the neighbouring months fill the
first and last weeks, marked `inMonth: false`.

```ts
const weeks = monthGrid(2083, 4); // Shrawan 2083
weeks[0][5]; // { date: 2083-04-01, inMonth: true }, a Friday
weeks[0][0]; // { date: 2083-03-28, inMonth: false }
```

- Weeks start on Sunday by default, as on Nepali calendars. Use
  `{ weekStartsOn: 1 }` for Monday, and so on.
- At the very edges of the supported range, cells for days that cannot be
  represented are `null`.
