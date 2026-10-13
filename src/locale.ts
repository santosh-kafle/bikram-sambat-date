/**
 * Month and weekday names, and digits, for formatting and parsing.
 *
 * Nepali names are those Hamro Patro shows. English names use the
 * romanization common in Nepali English-language media. Parsing also
 * accepts the alternative spellings listed in `MONTH_ALIASES` and
 * `WEEKDAY_ALIASES`.
 */

/** A supported locale: `en` (English) or `ne` (Nepali). */
export type Locale = 'en' | 'ne';

interface LocaleData {
  readonly months: readonly string[];
  readonly monthsShort: readonly string[];
  readonly weekdays: readonly string[];
  readonly weekdaysShort: readonly string[];
}

export const LOCALES: Readonly<Record<Locale, LocaleData>> = {
  en: {
    months: [
      'Baisakh',
      'Jestha',
      'Asar',
      'Shrawan',
      'Bhadra',
      'Asoj',
      'Kartik',
      'Mangsir',
      'Poush',
      'Magh',
      'Falgun',
      'Chaitra',
    ],
    monthsShort: [
      'Bai',
      'Jes',
      'Asa',
      'Shr',
      'Bha',
      'Aso',
      'Kar',
      'Man',
      'Pou',
      'Mag',
      'Fal',
      'Cha',
    ],
    weekdays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  ne: {
    months: [
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
    ],
    // Nepali has no conventional abbreviations; short forms are the names.
    monthsShort: [
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
    ],
    weekdays: [
      'आइतवार',
      'सोमवार',
      'मंगलवार',
      'बुधवार',
      'बिहिवार',
      'शुक्रवार',
      'शनिवार',
    ],
    weekdaysShort: ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'],
  },
};

/**
 * Other spellings parsing accepts for each month (index 0 is Baisakh), in
 * addition to every locale's names. English aliases match in any case.
 */
export const MONTH_ALIASES: readonly (readonly string[])[] = [
  ['Baishakh', 'Baisak', 'Vaishakh', 'Vaisakh', 'बैशाख'],
  ['Jeth', 'Jyeshtha', 'ज्येष्ठ', 'जेष्ठ'],
  ['Ashar', 'Asadh', 'Ashadh', 'Aashadha', 'Ashad', 'आषाढ', 'असाढ'],
  ['Saun', 'Sawan', 'Shravan', 'Srawan', 'श्रावण', 'साऊन'],
  ['Bhadau', 'Bhadrapad', 'भाद्र'],
  ['Ashoj', 'Ashwin', 'Aswin', 'Ashvin', 'आश्विन'],
  ['Kartika', 'Kattik', 'कात्तिक'],
  ['Mansir', 'Marga', 'Margashirsha', 'मार्ग', 'मङ्सिर'],
  ['Paush', 'Pus', 'Push', 'Pausa', 'पौष', 'पुस'],
  ['Magha'],
  ['Phalgun', 'Fagun', 'Phagun', 'फाल्गुन'],
  ['Chait', 'चैत्र'],
];

/** Other spellings parsing accepts for each weekday (index 0 is Sunday). */
export const WEEKDAY_ALIASES: readonly (readonly string[])[] = [
  ['आइतबार', 'आईतबार', 'Aaitabar', 'Aaitabaar'],
  ['सोमबार', 'Sombar', 'Sombaar'],
  ['मङ्गलबार', 'मंगलबार', 'Mangalbar', 'Mangalbaar'],
  ['बुधबार', 'Budhabar', 'Budhbar', 'Budhabaar'],
  ['बिहीबार', 'बिहिबार', 'Bihibar', 'Bihibaar'],
  ['शुक्रबार', 'Sukrabar', 'Shukrabar', 'Sukrabaar'],
  ['शनिबार', 'Sanibar', 'Shanibar', 'Sanibaar'],
];

const DEVANAGARI_ZERO = 0x0966;

/** Writes ASCII digits as Devanagari digits: `2083` → `२०८३`. */
export function toDevanagariDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) =>
    String.fromCharCode(DEVANAGARI_ZERO + Number(d)),
  );
}

/** Writes Devanagari digits as ASCII digits: `२०८३` → `2083`. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) =>
    String(d.charCodeAt(0) - DEVANAGARI_ZERO),
  );
}
