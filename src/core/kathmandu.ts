/**
 * Kathmandu wall-clock time. A calendar date for an instant depends on the
 * time zone, and BS dates are always Kathmandu dates, whatever the server's
 * own time zone.
 *
 * Offsets follow the IANA time zone database (Asia/Kathmandu):
 *
 * | From (UTC)               | Offset   |                              |
 * | ------------------------ | -------- | ---------------------------- |
 * | —                        | +5:41:16 | local mean time              |
 * | 1919-12-31T18:18:44Z     | +5:30    | 1 Jan 1920, clocks back 11m16s |
 * | 1985-12-31T18:30:00Z     | +5:45    | 1 Jan 1986, 00:00–00:15 skipped |
 *
 * Nepal has never used daylight saving time. The tests check these offsets
 * against the time zone data built into Node.js.
 */

const MINUTE = 60_000;
const DAY = 86_400_000;

/** RD day number of 1 January 1970, the Unix epoch. */
const UNIX_EPOCH_DAY_NUMBER = 719163;

/** Each offset and the instant (ms since the Unix epoch) it takes effect. */
const OFFSETS: readonly { from: number; offset: number }[] = [
  { from: -Infinity, offset: (5 * 3600 + 41 * 60 + 16) * 1000 },
  { from: Date.UTC(1919, 11, 31, 18, 18, 44), offset: 330 * MINUTE },
  { from: Date.UTC(1985, 11, 31, 18, 30), offset: 345 * MINUTE },
];

/** Kathmandu's offset from UTC at an instant, in milliseconds. */
export function kathmanduOffset(epochMs: number): number {
  let offset = OFFSETS[0]!.offset;
  for (const entry of OFFSETS) if (epochMs >= entry.from) offset = entry.offset;
  return offset;
}

/** The RD day number of the Kathmandu calendar date at an instant. */
export function dayNumberAtInstant(epochMs: number): number {
  const wall = epochMs + kathmanduOffset(epochMs);
  return Math.floor(wall / DAY) + UNIX_EPOCH_DAY_NUMBER;
}

/**
 * The first instant of a Kathmandu calendar day, in ms since the Unix epoch.
 * Usually local midnight; on 1 January 1986, whose first 15 minutes were
 * skipped, it is 00:15.
 */
export function startOfDayInstant(dayNumber: number): number {
  const midnight = (dayNumber - UNIX_EPOCH_DAY_NUMBER) * DAY;
  // Midnight under each offset, plus each transition: the earliest of these
  // that falls on the day is where the day starts.
  const candidates = [
    ...OFFSETS.map(({ offset }) => midnight - offset),
    ...OFFSETS.slice(1).map(({ from }) => from),
  ].sort((a, b) => a - b);
  return candidates.find((t) => dayNumberAtInstant(t) === dayNumber)!;
}
