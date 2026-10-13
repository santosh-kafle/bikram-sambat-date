import { describe, expect, it } from 'vitest';
import {
  BsDate,
  DateOutOfRangeError,
  DateParseError,
  InvalidDateError,
  type Locale,
  ProjectedDateError,
  supportedRange,
  toAsciiDigits,
  toDevanagariDigits,
} from '../src/index.js';
import { LOCALES, MONTH_ALIASES, WEEKDAY_ALIASES } from '../src/locale.js';

// 1 Shrawan 2083 is Friday, 17 July 2026.
const shrawan1 = BsDate.of(2083, 4, 1);

describe('format', () => {
  it.each([
    ['YYYY', '2083', '२०८३'],
    ['YY', '83', '८३'],
    ['MMMM', 'Shrawan', 'साउन'],
    ['MMM', 'Shr', 'साउन'],
    ['MM', '04', '०४'],
    ['M', '4', '४'],
    ['DD', '01', '०१'],
    ['D', '1', '१'],
    ['dddd', 'Friday', 'शुक्रवार'],
    ['ddd', 'Fri', 'शुक्र'],
    ['d', '5', '५'],
  ])('%s gives %s in English and %s in Nepali', (token, en, ne) => {
    expect(shrawan1.format(token)).toBe(en);
    expect(shrawan1.format(token, { locale: 'ne' })).toBe(ne);
  });

  it('defaults to YYYY-MM-DD in English', () => {
    expect(shrawan1.format()).toBe('2083-04-01');
    expect(shrawan1.format()).toBe(shrawan1.toString());
  });

  it('formats whole patterns', () => {
    expect(shrawan1.format('D MMMM YYYY, dddd')).toBe('1 Shrawan 2083, Friday');
    expect(shrawan1.format('D MMMM YYYY, dddd', { locale: 'ne' })).toBe(
      '१ साउन २०८३, शुक्रवार',
    );
    expect(BsDate.of(2083, 12, 30).format('DD/MM/YYYY')).toBe('30/12/2083');
  });

  it('copies [bracketed] text and other characters as they are', () => {
    expect(shrawan1.format('[Today is] dddd [D]')).toBe('Today is Friday D');
    expect(shrawan1.format('YYYY年MM月DD日')).toBe('2083年04月01日');
    expect(shrawan1.format('[मिति:] YYYY', { locale: 'ne' })).toBe(
      'मिति: २०८३',
    );
  });

  it('rejects unknown locales', () => {
    expect(() => shrawan1.format('YYYY', { locale: 'fr' as Locale })).toThrow(
      TypeError,
    );
  });
});

describe('names', () => {
  it('uses the Nepali month names Hamro Patro shows', () => {
    expect(LOCALES.ne.months).toEqual([
      'वैशाख',
      'जेठ',
      'असार',
      'साउन',
      'भदौ',
      'असोज',
      'कार्तिक',
      'मंसिर',
      'पुष',
      'माघ',
      'फागुन',
      'चैत',
    ]);
  });

  it('has twelve distinct months and seven distinct weekdays per locale', () => {
    for (const locale of Object.values(LOCALES)) {
      expect(new Set(locale.months).size).toBe(12);
      expect(new Set(locale.weekdays).size).toBe(7);
      expect(new Set(locale.weekdaysShort).size).toBe(7);
    }
    expect(new Set(LOCALES.en.monthsShort).size).toBe(12);
  });

  it('never gives two months or weekdays the same spelling', () => {
    const owner = new Map<string, number>();
    const check = (lists: readonly (readonly string[])[], what: string) => {
      owner.clear();
      lists.forEach((names, i) => {
        for (const name of names) {
          const key = name.toLowerCase();
          if (owner.has(key)) {
            expect(owner.get(key), `${what} '${name}'`).toBe(i);
          }
          owner.set(key, i);
        }
      });
    };
    const byMonth = Array.from({ length: 12 }, (_, i) => [
      ...Object.values(LOCALES).flatMap((l) => [
        l.months[i]!,
        l.monthsShort[i]!,
      ]),
      ...MONTH_ALIASES[i]!,
    ]);
    check(byMonth, 'month');
    const byWeekday = Array.from({ length: 7 }, (_, i) => [
      ...Object.values(LOCALES).flatMap((l) => [
        l.weekdays[i]!,
        l.weekdaysShort[i]!,
      ]),
      ...WEEKDAY_ALIASES[i]!,
    ]);
    check(byWeekday, 'weekday');
  });
});

describe('parse', () => {
  it('reads YYYY-MM-DD by default', () => {
    expect(BsDate.parse('2083-04-01').equals(shrawan1)).toBe(true);
  });

  it('reads Devanagari digits', () => {
    expect(BsDate.parse('२०८३-०४-०१').equals(shrawan1)).toBe(true);
    expect(BsDate.parse('१ साउन २०८३', 'D MMMM YYYY').equals(shrawan1)).toBe(
      true,
    );
  });

  it('reads month names in any case and common spellings', () => {
    for (const text of [
      '1 Shrawan 2083',
      '1 SHRAWAN 2083',
      '1 shr 2083',
      '1 Saun 2083',
      '1 Sawan 2083',
      '1 श्रावण 2083',
    ]) {
      expect(BsDate.parse(text, 'D MMMM YYYY').equals(shrawan1), text).toBe(
        true,
      );
    }
  });

  it('reads every alias as its own month', () => {
    MONTH_ALIASES.forEach((aliases, i) => {
      for (const alias of aliases) {
        expect(
          BsDate.parse(`2083 ${alias} 1`, 'YYYY MMMM D').month,
          alias,
        ).toBe(i + 1);
      }
    });
  });

  it('checks a weekday against the date', () => {
    expect(
      BsDate.parse('1 Shrawan 2083, Friday', 'D MMMM YYYY, dddd').equals(
        shrawan1,
      ),
    ).toBe(true);
    expect(
      BsDate.parse('शुक्रबार, १ साउन २०८३', 'dddd, D MMMM YYYY').equals(
        shrawan1,
      ),
    ).toBe(true);
    expect(() =>
      BsDate.parse('1 Shrawan 2083, Monday', 'D MMMM YYYY, dddd'),
    ).toThrow(DateParseError);
  });

  it('is lenient about whitespace, strict about everything else', () => {
    expect(
      BsDate.parse('  1   Shrawan  2083 ', 'D MMMM YYYY').equals(shrawan1),
    ).toBe(true);
    for (const text of [
      '2083-4-1',
      '2083/04/01',
      '2083-04-01x',
      '02083-04-01',
    ]) {
      expect(() => BsDate.parse(text), text).toThrow(DateParseError);
    }
    expect(BsDate.parse('2083-4-1', 'YYYY-M-D').equals(shrawan1)).toBe(true);
  });

  it('reads [bracketed] text literally', () => {
    expect(
      BsDate.parse('Date: 2083/04/01', '[Date:] YYYY/MM/DD').equals(shrawan1),
    ).toBe(true);
  });

  it('rejects patterns it cannot parse with', () => {
    expect(() => BsDate.parse('83-04-01', 'YY-MM-DD')).toThrow(DateParseError);
    expect(() => BsDate.parse('2083-04', 'YYYY-MM')).toThrow(DateParseError);
    expect(() => BsDate.parse('2083-04-04', 'YYYY-MM-MM')).toThrow(
      DateParseError,
    );
  });

  it('separates a malformed string from a date that does not exist', () => {
    expect(() => BsDate.parse('2083-01-32')).toThrow(InvalidDateError);
    expect(() => BsDate.parse('2083-13-01')).toThrow(InvalidDateError);
    expect(() => BsDate.parse('1900-01-01')).toThrow(DateOutOfRangeError);
    expect(() =>
      BsDate.parse('2090-01-01', undefined, { strict: true }),
    ).toThrow(ProjectedDateError);
  });
});

describe('round trip', () => {
  const { published, projected } = supportedRange();
  const first = published.bs.min.toInstant().getTime();
  const last = projected.bs.max.toInstant().getTime();
  const patterns = [
    'YYYY-MM-DD',
    'D MMMM YYYY',
    'DD/MM/YYYY, dddd',
    'YYYY MMM D ddd',
    'YYYY-M-D d',
  ];

  it.each(['en', 'ne'] as const)('parses what it formats (%s)', (locale) => {
    for (let ms = first; ms <= last; ms += 13 * 86_400_000) {
      const date = BsDate.fromInstant(ms);
      for (const pattern of patterns) {
        const text = date.format(pattern, { locale });
        expect(BsDate.parse(text, pattern).equals(date), text).toBe(true);
      }
    }
  });
});

describe('digits', () => {
  it('converts both ways', () => {
    expect(toDevanagariDigits('2083-04-01')).toBe('२०८३-०४-०१');
    expect(toAsciiDigits('२०८३-०४-०१')).toBe('2083-04-01');
    expect(toAsciiDigits(toDevanagariDigits('0123456789'))).toBe('0123456789');
  });
});
