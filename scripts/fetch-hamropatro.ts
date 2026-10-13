/**
 * Refreshes data/references/hamropatro.json: the month lengths and Gregorian
 * start dates Hamro Patro (https://www.hamropatro.com) shows for BS years.
 *
 *   npm run data:fetch-hamropatro -- 2083 2084      # those years
 *   npm run data:fetch-hamropatro -- 2000-2083      # a range
 *
 * Each calendar page embeds JSON for three months, so a year takes four
 * requests. Requests are sequential and spaced out to be polite.
 */
import { readFile, writeFile } from 'node:fs/promises';

const SNAPSHOT = new URL('../data/references/hamropatro.json', import.meta.url);
const URL_TEMPLATE = 'https://www.hamropatro.com/calendar/{year}/{month}/';
const DELAY_MS = 1500;

interface MonthRecord {
  days: number;
  startAd: string;
}

interface Snapshot {
  $comment: string;
  source: string;
  urlTemplate: string;
  retrieved: string;
  months: Record<string, MonthRecord>;
}

function parseYears(args: string[]): number[] {
  const years = args.flatMap((arg) => {
    const range = /^(\d{4})-(\d{4})$/.exec(arg);
    if (!range) return [Number(arg)];
    const [from, to] = [Number(range[1]), Number(range[2])];
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
  if (years.length === 0 || years.some((y) => !Number.isInteger(y))) {
    throw new Error('Usage: fetch-hamropatro <year | from-to>...');
  }
  return years;
}

/** Extracts every month embedded in one calendar page. */
function parsePage(html: string): Map<string, MonthRecord> {
  const text = html.replaceAll('\\"', '"');
  const months = new Map<string, MonthRecord>();
  const monthPattern = /"yearBs":(\d+),"monthBs":(\d+),.*?"daysInMonth":(\d+)/g;
  for (const [, year, month, days] of text.matchAll(monthPattern)) {
    const firstDay = new RegExp(
      `"year_ad":(\\d+),"month_ad":(\\d+),"day_ad":(\\d+),"year_bs":${year},"month_bs":${month},"day_bs":1,`,
    ).exec(text);
    if (!firstDay) continue;
    const [, y, m, d] = firstDay.map(Number);
    months.set(`${year}-${month!.padStart(2, '0')}`, {
      days: Number(days),
      startAd: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }
  return months;
}

async function main(): Promise<void> {
  const years = parseYears(process.argv.slice(2));
  const snapshot = JSON.parse(await readFile(SNAPSHOT, 'utf8')) as Snapshot;

  for (const year of years) {
    for (const month of [2, 5, 8, 11]) {
      const url = URL_TEMPLATE.replace('{year}', String(year)).replace(
        '{month}',
        String(month),
      );
      const response = await fetch(url, {
        headers: { 'User-Agent': 'bikram-sambat-date data refresh' },
      });
      if (!response.ok) {
        console.warn(`${url}: HTTP ${response.status}, skipped`);
      } else {
        for (const [key, record] of parsePage(await response.text())) {
          snapshot.months[key] = record;
        }
        console.log(`${url}: ok`);
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  snapshot.retrieved = new Date().toISOString().slice(0, 10);
  snapshot.months = Object.fromEntries(
    Object.entries(snapshot.months).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
}

await main();
