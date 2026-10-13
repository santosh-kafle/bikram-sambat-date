/**
 * Builds src/data/calendar.generated.ts and data/REPORT.md from the inputs
 * in data/. Run with `npm run data:build`; add `-- --check` to fail instead
 * of writing when the outputs are stale (for CI).
 *
 * For each BS year from `minYear` to `maxYear` the month lengths come from:
 *   1. the reference (Hamro Patro) when it has all twelve months, or else
 *   2. the source tables, when every one that covers the year agrees, or else
 *   3. the source named in `resolutions` in data/calendar.config.json.
 * Any other disagreement fails the build, as does a resolution for a year
 * that no longer needs one. Every year must have 29–32 day months and 365
 * or 366 days, and every month start the reference records must match the
 * table. See docs/data-sources.md.
 */
import { readFile, writeFile } from 'node:fs/promises';
import {
  dayNumberToGregorian,
  gregorianToDayNumber,
} from '../src/core/gregorian.js';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

type MonthLengths = number[];
type Table = Map<number, MonthLengths>;

interface SourceEntry {
  id: string;
  name: string;
  repository: string;
  commit: string;
  file: string;
  format: string;
  license: string;
}

interface Config {
  minYear: number;
  maxYear: number;
  anchor: { bs: string; ad: string; evidence: string };
  resolutions: Record<string, { use: string; reason: string }>;
}

interface ReferenceSnapshot {
  source: string;
  retrieved: string;
  months: Record<string, { days: number; startAd: string }>;
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

const sum = (months: MonthLengths) => months.reduce((a, b) => a + b, 0);
const key = (months: MonthLengths) => months.join(',');
const isoDayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return gregorianToDayNumber(y!, m!, d!);
};
const isoOf = (dayNumber: number) => {
  const { year, month, day } = dayNumberToGregorian(dayNumber);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

function validateYear(year: number, months: MonthLengths): string[] {
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

type Decision =
  | { kind: 'reference'; months: MonthLengths; dissent: string[] }
  | { kind: 'unanimous'; months: MonthLengths }
  | { kind: 'resolved'; months: MonthLengths; use: string; reason: string };

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
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
      (_, m) =>
        reference.months[`${year}-${String(m + 1).padStart(2, '0')}`]?.days,
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

  // Every month start the reference records must agree with the table.
  let checkedStarts = 0;
  let start = epoch;
  for (let year = config.minYear; year <= config.maxYear; year++) {
    decisions.get(year)!.months.forEach((days, m) => {
      const record =
        reference.months[`${year}-${String(m + 1).padStart(2, '0')}`];
      if (record) {
        checkedStarts++;
        if (record.startAd !== isoOf(start)) {
          errors.push(
            `${year}-${m + 1}: reference starts it on ${record.startAd}, table on ${isoOf(start)}`,
          );
        }
      }
      start += days;
    });
  }
  if (errors.length > 0) {
    throw new Error(
      `Reference dates disagree with the table:\n  ${errors.join('\n  ')}`,
    );
  }

  const generated = renderTable(config, epoch, decisions);
  const report = renderReport({
    config,
    sources,
    tables,
    reference,
    decisions,
    epoch,
    lastDay: start - 1,
    checkedStarts,
    referenceYear,
  });

  const outputs: [string, string][] = [
    ['src/data/calendar.generated.ts', generated],
    ['data/REPORT.md', report],
  ];
  if (check) {
    const stale: string[] = [];
    for (const [path, content] of outputs) {
      const current = await read(path).catch(() => '');
      if (current !== content) stale.push(path);
    }
    if (stale.length > 0) {
      throw new Error(
        `Out of date (run npm run data:build): ${stale.join(', ')}`,
      );
    }
    console.log('Calendar data is up to date.');
    return;
  }
  for (const [path, content] of outputs) {
    await writeFile(new URL(path, root), content);
  }
  console.log(
    `Wrote BS ${config.minYear}–${config.maxYear} (${isoOf(epoch)} to ${isoOf(start - 1)}); ` +
      `${checkedStarts} month starts match the reference.`,
  );
}

// ---------------------------------------------------------------------------
// Output rendering
// ---------------------------------------------------------------------------

function renderTable(
  config: Config,
  epoch: number,
  decisions: Map<number, Decision>,
): string {
  const rows = [...decisions].map(
    ([year, d]) => `  [${d.months.join(', ')}], // ${year}`,
  );
  return `// Generated by scripts/build-calendar.ts from data/. Do not edit by hand:
// change the inputs and run \`npm run data:build\`.

/** The first BS year the table covers. */
export const BS_MIN_YEAR = ${config.minYear};

/** The last BS year the table covers. */
export const BS_MAX_YEAR = ${config.maxYear};

/** The RD day number of 1 Baisakh ${config.minYear} (${isoOf(epoch)} AD). */
export const BS_EPOCH_DAY_NUMBER = ${epoch};

/** Days in each month (Baisakh first) of each year from BS_MIN_YEAR. */
export const MONTH_LENGTHS: readonly (readonly number[])[] = [
${rows.join('\n')}
];
`;
}

function renderReport(input: {
  config: Config;
  sources: SourceEntry[];
  tables: Map<string, Table>;
  reference: ReferenceSnapshot;
  decisions: Map<number, Decision>;
  epoch: number;
  lastDay: number;
  checkedStarts: number;
  referenceYear: (year: number) => MonthLengths | undefined;
}): string {
  const { config, sources, tables, reference, decisions } = input;
  const count = (kind: Decision['kind']) =>
    [...decisions.values()].filter((d) => d.kind === kind).length;

  const sourceRows = sources.map((s) => {
    const years = [...tables.get(s.id)!.keys()];
    let agree = 0;
    let covered = 0;
    for (const [year, d] of decisions) {
      const months = tables.get(s.id)!.get(year);
      if (!months) continue;
      covered++;
      if (key(months) === key(d.months)) agree++;
    }
    return `| [${s.name}](${s.repository}) | ${s.license} | ${Math.min(...years)}–${Math.max(...years)} | ${agree}/${covered} |`;
  });

  const disputedRows = [...decisions].flatMap(([year, d]) => {
    if (d.kind === 'unanimous') return [];
    if (d.kind === 'reference' && d.dissent.length === 0) return [];
    const how =
      d.kind === 'reference'
        ? `${reference.source} (reference). Differs: ${d.dissent.join(', ')}`
        : `${d.use}. ${d.reason}`;
    return [`| ${year} | ${d.months.join(' ')} | ${how} |`];
  });

  const beyond: string[] = [];
  for (let year = config.maxYear + 1; ; year++) {
    const months = input.referenceYear(year);
    if (!months) break;
    const start = reference.months[`${year}-01`]!.startAd;
    const notes = [
      ...(validateYear(year, months).length ? ['impossible year length'] : []),
      ...(/-04-1[34]$/.test(start) ? [] : ['implausible New Year']),
    ];
    beyond.push(
      `| ${year} | ${start} | ${sum(months)} | ${notes.join(', ')} |`,
    );
  }

  return `# Calendar data report

Generated by \`npm run data:build\`. Do not edit by hand.

- **Range:** BS ${config.minYear}–${config.maxYear} (${isoOf(input.epoch)} to ${isoOf(input.lastDay)} AD)
- **Anchor:** ${config.anchor.bs} BS = ${config.anchor.ad} AD (${config.anchor.evidence})
- **Years:** ${count('unanimous')} unanimous, ${count('reference')} from the reference, ${count('resolved')} resolved by hand
- **Reference:** ${input.checkedStarts} month starts from ${reference.source} (retrieved ${reference.retrieved}) match the table

## Sources

Agreement counts years in the range where the source matches the final table.

| Source | License | Years | Agreement |
| --- | --- | --- | --- |
${sourceRows.join('\n')}

## Disputed years

| Year | Month lengths used | Decision |
| --- | --- | --- |
${disputedRows.join('\n')}

## Reference years beyond the table

${reference.source} also lists these years. They are projections, not
published calendars, so the table stops at ${config.maxYear}. A valid year
has 365 or 366 days and starts on 13 or 14 April.

| Year | 1 Baisakh | Days | Problems |
| --- | --- | --- | --- |
${beyond.join('\n')}
`;
}

await main();
