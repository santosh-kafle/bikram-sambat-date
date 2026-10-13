/**
 * Builds src/data/calendar.generated.ts and data/REPORT.md from the inputs
 * in data/. Run with `npm run data:build`; add `-- --check` to fail instead
 * of writing when the outputs are stale (for CI).
 *
 * The table has two parts:
 *   - published years, `minYear`–`maxYear`, decided and checked by
 *     scripts/lib/verified-table.ts (see docs/data-sources.md);
 *   - projected years, `maxYear + 1`–`projection.maxYear`, whose month starts
 *     come from the Sūrya Siddhānta engine in scripts/astro/ with the
 *     parameters in `projection` (see docs/projection.md).
 * The build fails if the projection does not continue the published table
 * seamlessly, or produces an impossible month or year, or a New Year's Day
 * more than a day from where the mean sidereal year puts it.
 */
import { writeFile } from 'node:fs/promises';
import { monthStart } from './astro/sankranti.js';
import { SIDEREAL_YEAR } from './astro/surya-siddhanta.js';
import {
  type Decision,
  isoOf,
  key,
  loadVerifiedTable,
  monthKey,
  type MonthLengths,
  read,
  root,
  sum,
  validateYear,
  type VerifiedTable,
} from './lib/verified-table.js';

interface Projection {
  /** Month lengths per projected year, in year order. */
  years: Map<number, MonthLengths>;
  /** First day number of each projected month, keyed `YYYY-MM`. */
  starts: Map<string, number>;
  /** Month starts (`YYYY-MM`) within the uncertainty margin of a boundary. */
  uncertain: string[];
}

/** Projects every year after the published table. */
function project(verified: VerifiedTable): Projection {
  const { maxYear, projection } = verified.config;
  const errors: string[] = [];

  // Month starts from the first projected Baisakh through the Baisakh after
  // the last projected year, which closes the last year's Chaitra.
  const starts: { key: string; day: number }[] = [];
  const uncertain: string[] = [];
  for (let year = maxYear + 1; year <= projection.maxYear + 1; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year > projection.maxYear && month > 1) break;
      const start = monthStart(year, month, projection);
      starts.push({ key: monthKey(year, month), day: start.dayNumber });
      if (start.marginMinutes < projection.uncertainMarginMinutes) {
        uncertain.push(monthKey(year, month));
      }
    }
  }

  if (starts[0]!.day !== verified.lastDay + 1) {
    errors.push(
      `projected ${starts[0]!.key} starts on ${isoOf(starts[0]!.day)}, ` +
        `but the published table ends on ${isoOf(verified.lastDay)}`,
    );
  }

  const years = new Map<number, MonthLengths>();
  for (let i = 0; i + 1 < starts.length; i++) {
    const year = Number(starts[i]!.key.slice(0, 4));
    const months = years.get(year) ?? [];
    months.push(starts[i + 1]!.day - starts[i]!.day);
    years.set(year, months);
  }
  // New Year's Day can only drift from the last published one at the rate of
  // the mean sidereal year; allow a day either way for the true Sun.
  const lastNewYear =
    verified.lastDay + 1 - sum(verified.decisions.get(maxYear)!.months);
  for (const [year, months] of years) {
    errors.push(...validateYear(year, months));
    const newYear = starts.find((s) => s.key === monthKey(year, 1))!.day;
    const expected = lastNewYear + (year - maxYear) * SIDEREAL_YEAR;
    if (Math.abs(newYear - expected) > 1) {
      errors.push(
        `${year}: New Year's Day on ${isoOf(newYear)}, expected about ${isoOf(Math.round(expected))}`,
      );
    }
  }
  if (errors.length > 0) {
    throw new Error(`Projection is not consistent:\n  ${errors.join('\n  ')}`);
  }
  return {
    years,
    starts: new Map(starts.map((s) => [s.key, s.day])),
    uncertain,
  };
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const verified = await loadVerifiedTable();
  const projection = project(verified);

  const outputs: [string, string][] = [
    ['src/data/calendar.generated.ts', renderTable(verified, projection)],
    ['data/REPORT.md', renderReport(verified, projection)],
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
  const { config } = verified;
  console.log(
    `Wrote published BS ${config.minYear}–${config.maxYear} ` +
      `(${verified.checkedStarts} month starts match the reference) and ` +
      `projected BS ${config.maxYear + 1}–${config.projection.maxYear} ` +
      `(${projection.uncertain.length} uncertain month starts).`,
  );
}

// ---------------------------------------------------------------------------
// Output rendering
// ---------------------------------------------------------------------------

function renderTable(verified: VerifiedTable, projection: Projection): string {
  const { config, decisions, epoch } = verified;
  const row = (year: number, months: MonthLengths) =>
    `  [${months.join(', ')}], // ${year}`;
  const published = [...decisions].map(([year, d]) => row(year, d.months));
  const projected = [...projection.years].map(([year, months]) =>
    row(year, months),
  );
  const uncertain = projection.uncertain.map((k) => `  '${k}',`);

  return `// Generated by scripts/build-calendar.ts from data/. Do not edit by hand:
// change the inputs and run \`npm run data:build\`.

/** The first BS year the table covers. */
export const BS_MIN_YEAR = ${config.minYear};

/**
 * The last BS year with a published calendar. Later years are projected by
 * the Sūrya Siddhānta; see docs/projection.md.
 */
export const BS_LAST_PUBLISHED_YEAR = ${config.maxYear};

/** The last BS year the table covers, including projected years. */
export const BS_MAX_YEAR = ${config.projection.maxYear};

/** The RD day number of 1 Baisakh ${config.minYear} (${isoOf(epoch)} AD). */
export const BS_EPOCH_DAY_NUMBER = ${epoch};

/** Days in each month (Baisakh first) of each year from BS_MIN_YEAR. */
export const MONTH_LENGTHS: readonly (readonly number[])[] = [
${published.join('\n')}
  // Projected from here on (BS ${config.maxYear + 1}–${config.projection.maxYear}).
${projected.join('\n')}
];

/**
 * Projected month starts (\`YYYY-MM\`) whose saṅkrānti falls within
 * ${config.projection.uncertainMarginMinutes} minutes of a boundary of the month rule, so the month may
 * start a day earlier or later than projected.
 */
export const UNCERTAIN_MONTH_STARTS: readonly string[] = [
${uncertain.join('\n')}
];
`;
}

function renderReport(verified: VerifiedTable, projection: Projection): string {
  const { config, sources, tables, reference, decisions } = verified;
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

  // Compare the reference's own projections with ours.
  const beyond: string[] = [];
  for (let year = config.maxYear + 1; ; year++) {
    const months = verified.referenceYear(year);
    if (!months) break;
    const start = reference.months[monthKey(year, 1)]!.startAd;
    const notes = [
      ...(validateYear(year, months).length ? ['impossible year length'] : []),
      ...(/-04-1[34]$/.test(start) ? [] : ['implausible New Year']),
    ];
    let matching = 0;
    for (let m = 1; m <= 12; m++) {
      const theirs = reference.months[monthKey(year, m)]!.startAd;
      const ours = projection.starts.get(monthKey(year, m));
      if (ours !== undefined && isoOf(ours) === theirs) matching++;
    }
    beyond.push(
      `| ${year} | ${start} | ${sum(months)} | ${matching}/12 | ${notes.join(', ')} |`,
    );
  }

  const { projection: p } = config;
  const uncertainList = projection.uncertain.join(', ');

  return `# Calendar data report

Generated by \`npm run data:build\`. Do not edit by hand.

- **Published range:** BS ${config.minYear}–${config.maxYear} (${isoOf(verified.epoch)} to ${isoOf(verified.lastDay)} AD)
- **Projected range:** BS ${config.maxYear + 1}–${p.maxYear}
- **Anchor:** ${config.anchor.bs} BS = ${config.anchor.ad} AD (${config.anchor.evidence})
- **Published years:** ${count('unanimous')} unanimous, ${count('reference')} from the reference, ${count('resolved')} resolved by hand
- **Reference:** ${verified.checkedStarts} month starts from ${reference.source} (retrieved ${reference.retrieved}) match the table

## Sources

Agreement counts published years where the source matches the final table.

| Source | License | Years | Agreement |
| --- | --- | --- | --- |
${sourceRows.join('\n')}

## Disputed years

| Year | Month lengths used | Decision |
| --- | --- | --- |
${disputedRows.join('\n')}

## Projection

Years after ${config.maxYear} come from the Sūrya Siddhānta engine
(model \`${p.model}\`, offset ${p.offsetMinutes} minutes); see
[docs/projection.md](../docs/projection.md) and the accuracy report
[ACCURACY.md](ACCURACY.md).

${projection.uncertain.length} projected month starts fall within ${p.uncertainMarginMinutes} minutes of a
boundary of the month rule and are flagged uncertain: ${uncertainList}.

## Reference projections

${reference.source} also lists years after ${config.maxYear}. These are its own
projections, not published calendars. A valid year has 365 or 366 days and
starts on 13 or 14 April in this century. "Agree" counts the month starts
that are the same as this library's projection.

| Year | 1 Baisakh | Days | Agree | Problems |
| --- | --- | --- | --- | --- |
${beyond.join('\n')}
`;
}

await main();
