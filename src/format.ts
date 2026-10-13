/**
 * Formatting and parsing BS dates with patterns such as `YYYY-MM-DD` or
 * `D MMMM YYYY, dddd`. See docs/formatting.md for the tokens.
 */
import { DateParseError } from './errors.js';
import {
  type Locale,
  LOCALES,
  MONTH_ALIASES,
  toAsciiDigits,
  toDevanagariDigits,
  WEEKDAY_ALIASES,
} from './locale.js';

/** Options for `BsDate#format`. */
export interface FormatOptions {
  /** `en` (default) or `ne`, which also writes digits in Devanagari. */
  readonly locale?: Locale;
}

/** The fields of a date that formatting reads. */
export interface DateFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  /** 0 is Sunday. */
  readonly weekday: number;
}

/** What parsing reads from a string; the weekday only if the pattern has one. */
export interface ParsedFields {
  year: number;
  month: number;
  day: number;
  weekday?: number;
}

/** Matches a `[literal]` or a token, longest tokens first. */
const TOKEN = /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|d/g;

/** The default pattern: ISO-style `2083-04-01`. */
export const DEFAULT_PATTERN = 'YYYY-MM-DD';

/** Formats date fields with a pattern. */
export function formatFields(
  date: DateFields,
  pattern: string,
  options: FormatOptions = {},
): string {
  const locale = options.locale ?? 'en';
  const names = LOCALES[locale];
  if (!names) throw new TypeError(`Unknown locale: ${String(locale)}`);
  const number = (n: number, width: number) => {
    const digits = String(n).padStart(width, '0');
    return locale === 'ne' ? toDevanagariDigits(digits) : digits;
  };
  return pattern.replace(TOKEN, (token, literal: string | undefined) => {
    if (literal !== undefined) return literal;
    switch (token) {
      case 'YYYY':
        return number(date.year, 4);
      case 'YY':
        return number(date.year % 100, 2);
      case 'MMMM':
        return names.months[date.month - 1]!;
      case 'MMM':
        return names.monthsShort[date.month - 1]!;
      case 'MM':
        return number(date.month, 2);
      case 'M':
        return number(date.month, 1);
      case 'DD':
        return number(date.day, 2);
      case 'D':
        return number(date.day, 1);
      case 'dddd':
        return names.weekdays[date.weekday]!;
      case 'ddd':
        return names.weekdaysShort[date.weekday]!;
      default: // 'd'
        return number(date.weekday, 1);
    }
  });
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const normalize = (text: string) => text.normalize('NFC').toLowerCase();
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every accepted spelling, lower-cased, mapped to its index. */
function nameIndex(
  lists: readonly (readonly string[])[],
  aliases: readonly (readonly string[])[],
): Map<string, number> {
  const index = new Map<string, number>();
  for (const list of lists) {
    list.forEach((name, i) => index.set(normalize(name), i));
  }
  aliases.forEach((names, i) => {
    for (const name of names) index.set(normalize(name), i);
  });
  return index;
}

let monthNames: Map<string, number> | undefined;
let weekdayNames: Map<string, number> | undefined;

const getMonthNames = () =>
  (monthNames ??= nameIndex(
    Object.values(LOCALES).flatMap((l) => [l.months, l.monthsShort]),
    MONTH_ALIASES,
  ));
const getWeekdayNames = () =>
  (weekdayNames ??= nameIndex(
    Object.values(LOCALES).flatMap((l) => [l.weekdays, l.weekdaysShort]),
    WEEKDAY_ALIASES,
  ));

/** A regex alternation of names, longest first so prefixes do not win. */
const alternation = (names: Map<string, number>) =>
  `(${[...names.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')})`;

type Field = 'year' | 'month' | 'monthName' | 'day' | 'weekday' | 'weekdayName';

const PARSE_TOKENS: Record<string, { field: Field; pattern: () => string }> = {
  YYYY: { field: 'year', pattern: () => '(\\d{4})' },
  MMMM: { field: 'monthName', pattern: () => alternation(getMonthNames()) },
  MMM: { field: 'monthName', pattern: () => alternation(getMonthNames()) },
  MM: { field: 'month', pattern: () => '(\\d{2})' },
  M: { field: 'month', pattern: () => '(\\d{1,2})' },
  DD: { field: 'day', pattern: () => '(\\d{2})' },
  D: { field: 'day', pattern: () => '(\\d{1,2})' },
  dddd: { field: 'weekdayName', pattern: () => alternation(getWeekdayNames()) },
  ddd: { field: 'weekdayName', pattern: () => alternation(getWeekdayNames()) },
  d: { field: 'weekday', pattern: () => '([0-6])' },
};

/**
 * Reads date fields from a string with a pattern. Digits may be ASCII or
 * Devanagari, month and weekday names may use any known spelling in any
 * case, and spaces in the pattern match any run of whitespace. Does not
 * check that the date exists.
 *
 * @throws {DateParseError} if the string does not match, or the pattern
 *   cannot be parsed with.
 */
export function parseFields(text: string, pattern: string): ParsedFields {
  const fields: Field[] = [];
  let source = '';
  let last = 0;
  const literal = (chunk: string) =>
    escapeRegExp(normalize(chunk)).replace(/\s+/g, '\\s+');

  for (const match of pattern.matchAll(TOKEN)) {
    source += literal(pattern.slice(last, match.index));
    last = match.index + match[0].length;
    if (match[1] !== undefined) {
      source += literal(match[1]);
      continue;
    }
    const token = PARSE_TOKENS[match[0]];
    if (!token) {
      throw new DateParseError(
        `Pattern token ${match[0]} cannot be parsed (use YYYY for the year)`,
      );
    }
    const field = token.field.replace('Name', '') as Field;
    if (fields.some((f) => f.replace('Name', '') === field)) {
      throw new DateParseError(`Pattern '${pattern}' repeats the ${field}`);
    }
    fields.push(token.field);
    source += token.pattern();
  }
  source += literal(pattern.slice(last));

  for (const required of ['year', 'month', 'day']) {
    if (!fields.some((f) => f.startsWith(required))) {
      throw new DateParseError(
        `Pattern '${pattern}' has no ${required}; it needs a year, month and day`,
      );
    }
  }

  const input = normalize(toAsciiDigits(text.trim()));
  // Names in the pattern are lower-cased like the input, so matching ignores case.
  const match = new RegExp(`^${source}$`).exec(input);
  if (!match) {
    throw new DateParseError(
      `'${text}' does not match the pattern '${pattern}'`,
    );
  }

  const result: Partial<ParsedFields> = {};
  fields.forEach((field, i) => {
    const value = match[i + 1]!;
    switch (field) {
      case 'monthName':
        result.month = getMonthNames().get(value)! + 1;
        break;
      case 'weekdayName':
        result.weekday = getWeekdayNames().get(value)!;
        break;
      default:
        result[field] = Number(value);
    }
  });
  return result as ParsedFields;
}
