/**
 * The verified part of the calendar: month lengths for the published years,
 * decided from the inputs in data/ and checked against the reference.
 *
 * For each BS year from `minYear` to `maxYear` the month lengths come from:
 *   1. the reference (Hamro Patro) when it has all twelve months, or else
 *   2. the source tables, when every one that covers the year agrees, or else
 *   3. the source named in `resolutions` in data/calendar.config.json.
 * Any other disagreement is an error, as is a resolution for a year that no
 * longer needs one. Every year must have 29–32 day months and 365 or 366
 * days, and every month start the reference records must match the table.
 * See docs/data-sources.md.
 */
import { readFile } from 'node:fs/promises';
import {
  dayNumberToGregorian,
  gregorianToDayNumber,
} from '../../src/core/gregorian.js';

export const root = new URL('../../', import.meta.url);
export const read = (path: string) => readFile(new URL(path, root), 'utf8');

export type MonthLengths = number[];
export type Table = Map<number, MonthLengths>;

export interface SourceEntry {
  id: string;
  name: string;
  repository: string;
  commit: string;
  file: string;
  format: string;
  license: string;
}

export interface ProjectionConfig {
  maxYear: number;
  model: 'fixed-apogee' | 'calendrical-calculations';
  offsetMinutes: number;
  uncertainMarginMinutes: number;
}

export interface Config {
  minYear: number;
  maxYear: number;
  anchor: { bs: string; ad: string; evidence: string };
  resolutions: Record<string, { use: string; reason: string }>;
  projection: ProjectionConfig;
}

export interface ReferenceSnapshot {
  source: string;
  retrieved: string;
  months: Record<string, { days: number; startAd: string }>;
}

export type Decision =
  | { kind: 'reference'; months: MonthLengths; dissent: string[] }
  | { kind: 'unanimous'; months: MonthLengths }
  | { kind: 'resolved'; months: MonthLengths; use: string; reason: string };

export interface VerifiedTable {
  config: Config;
  sources: SourceEntry[];
  tables: Map<string, Table>;
  reference: ReferenceSnapshot;
  /** Month lengths per verified year, in year order. */
  decisions: Map<number, Decision>;
  /** Day number of 1 Baisakh of `config.minYear`. */
  epoch: number;
  /** Day number of the last day of `config.maxYear`. */
  lastDay: number;
  /** How many reference month starts were checked against the table. */
  checkedStarts: number;
  referenceYear: (year: number) => MonthLengths | undefined;
}

// ---------------------------------------------------------------------------
// Small helpers shared by the scripts
// ---------------------------------------------------------------------------

export const sum = (months: MonthLengths) => months.reduce((a, b) => a + b, 0);
export const key = (months: MonthLengths) => months.join(',');
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const monthKey = (year: number, month: number) =>
  `${year}-${pad2(month)}`;

export const isoDayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return gregorianToDayNumber(y!, m!, d!);
};

export const isoOf = (dayNumber: number) => {
  const { year, month, day } = dayNumberToGregorian(dayNumber);
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

export function validateYear(year: number, months: MonthLengths): string[] {
  const problems: string[] = [];
  if (months.length !== 12) problems.push(`${year}: ${months.length} months`);
  if (months.some((d) => !Number.isInteger(d) || d < 29 || d > 32)) {
    problems.push(`${year}: a month outside 29–32 days (${key(months)})`);
  }
  if (sum(months) !== 365 && sum(months) !== 366) {
    problems.push(`${year}: ${sum(months)} days in the year`);
  }
  return problems;
}

/** The first day number of every verified month, keyed `YYYY-MM`. */
export function monthStarts(verified: VerifiedTable): Map<string, number> {
  const starts = new Map<string, number>();
  let day = verified.epoch;
  for (const [year, { months }] of verified.decisions) {
    months.forEach((length, m) => {
      starts.set(monthKey(year, m + 1), day);
      day += length;
    });
  }
  return starts;
}

// ---------------------------------------------------------------------------
// Source parsers: each turns one upstream file into year → 12 month lengths.
// ---------------------------------------------------------------------------

const numbers = (list: string): number[] =>
  list
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n !== '')
    .map(Number);

const parsers: Record<string, (text: string) => Table> = {
  'nepali-datetime-csv': (text) =>
    new Map(
      text
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => {
          const [year, ...months] = numbers(line);
          return [year!, months];
        }),
    ),

  'medic-json': (text) =>
    new Map(
      Object.entries(JSON.parse(text) as Record<string, number[]>).map(
        ([year, months]) => [Number(year), months],
      ),
    ),

  'subeshb1-ts': (text) =>
    new Map(
      [...text.matchAll(/'(\d{4})':\s*\{([^}]*)\}/g)].map(([, year, body]) => [
        Number(year),
        [...body!.matchAll(/:\s*(\d+)/g)].map(([, n]) => Number(n)),
      ]),
    ),

  // The file also holds cumulative tables; only the first one is month lengths.
  'ashok095-py': (text) =>
    new Map(
      [
        ...text
          .split('CUMULATIVE_DAYS_BS')[0]!
          .matchAll(/(\d{4}):\s*\[([^\]]*)\]/g),
      ].map(([, year, list]) => [Number(year), numbers(list!)]),
    ),

  // Rows end with the year's total, and some years alias an earlier one.
  'remotemerge-ts': (text) => {
    const table: Table = new Map();
    const rows = /years\[(\d{4})\]\s*=\s*(?:\[([^\]]*)\]|years\[(\d{4})\])/g;
    for (const [, year, list, alias] of text.matchAll(rows)) {
      const months = list
        ? numbers(list).slice(0, 12)
        : table.get(Number(alias));
      if (months) table.set(Number(year), months);
    }
    return table;
  },

  'sandipghimire-ts': (text) =>
    new Map(
      [...text.matchAll(/year:\s*(\d{4}),\s*days:\s*\[([^\]]*)\]/g)].map(
        ([, year, list]) => [Number(year), numbers(list!)],
      ),
    ),
};

// ---------------------------------------------------------------------------

/** Reads data/, decides every verified year, and checks the result. */
export async function loadVerifiedTable(): Promise<VerifiedTable> {
  const config = JSON.parse(await read('data/calendar.config.json')) as Config;
  const { sources } = JSON.parse(await read('data/sources/manifest.json')) as {
    sources: SourceEntry[];
  };
  const reference = JSON.parse(
    await read('data/references/hamropatro.json'),
  ) as ReferenceSnapshot;

  const tables = new Map<string, Table>();
  for (const source of sources) {
    const parse = parsers[source.format];
    if (!parse) throw new Error(`No parser for format ${source.format}`);
    tables.set(source.id, parse(await read(`data/sources/${source.file}`)));
  }

  const referenceYear = (year: number): MonthLengths | undefined => {
    const months = Array.from(
      { length: 12 },
      (_, m) => reference.months[monthKey(year, m + 1)]?.days,
    );
    return months.every((d) => d !== undefined) ? months : undefined;
  };

  const errors: string[] = [];
  const decisions = new Map<number, Decision>();

  for (let year = config.minYear; year <= config.maxYear; year++) {
    const votes = new Map<string, string[]>();
    for (const [id, table] of tables) {
      const months = table.get(year);
      if (months)
        votes.set(key(months), [...(votes.get(key(months)) ?? []), id]);
    }
    const resolution = config.resolutions[String(year)];
    const fromReference = referenceYear(year);

    if (fromReference) {
      const dissent = [...votes]
        .filter(([k]) => k !== key(fromReference))
        .flatMap(([, ids]) => ids);
      decisions.set(year, {
        kind: 'reference',
        months: fromReference,
        dissent,
      });
      if (resolution) {
        errors.push(`${year}: has a resolution but the reference covers it`);
      }
    } else if (votes.size === 1 && [...votes.values()][0]!.length >= 2) {
      decisions.set(year, {
        kind: 'unanimous',
        months: numbers([...votes.keys()][0]!),
      });
      if (resolution) errors.push(`${year}: has a resolution but no dispute`);
    } else if (resolution) {
      const months = tables.get(resolution.use)?.get(year);
      if (!months) {
        errors.push(`${year}: resolution source ${resolution.use} has no data`);
        continue;
      }
      decisions.set(year, { kind: 'resolved', months, ...resolution });
    } else {
      const summary = [...votes]
        .map(([k, ids]) => `[${ids.join(', ')}] ${k}`)
        .join('; ');
      errors.push(`${year}: sources disagree and no resolution: ${summary}`);
    }
  }

  for (const [year, decision] of decisions) {
    errors.push(...validateYear(year, decision.months));
  }
  if (errors.length > 0) {
    throw new Error(
      `Calendar data is not consistent:\n  ${errors.join('\n  ')}`,
    );
  }

  // Place the table on the day-number line using the anchor date.
  const [anchorYear, anchorMonth, anchorDay] = config.anchor.bs
    .split('-')
    .map(Number) as [number, number, number];
  let offset = anchorDay - 1;
  for (let y = config.minYear; y < anchorYear; y++)
    offset += sum(decisions.get(y)!.months);
  for (let m = 0; m < anchorMonth - 1; m++)
    offset += decisions.get(anchorYear)!.months[m]!;
  const epoch = isoDayNumber(config.anchor.ad) - offset;

  const verified: VerifiedTable = {
    config,
    sources,
    tables,
    reference,
    decisions,
    epoch,
    lastDay: 0,
    checkedStarts: 0,
    referenceYear,
  };

  // Every month start the reference records must agree with the table.
  const starts = monthStarts(verified);
  for (const [month, start] of starts) {
    const record = reference.months[month];
    if (!record) continue;
    verified.checkedStarts++;
    if (record.startAd !== isoOf(start)) {
      errors.push(
        `${month}: reference starts it on ${record.startAd}, table on ${isoOf(start)}`,
      );
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `Reference dates disagree with the table:\n  ${errors.join('\n  ')}`,
    );
  }

  const lastYear = decisions.get(config.maxYear)!.months;
  verified.lastDay =
    starts.get(monthKey(config.maxYear, 12))! + lastYear[11]! - 1;
  return verified;
}
