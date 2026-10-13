import { describe, expect, it } from 'vitest';
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BsDate,
  DateOutOfRangeError,
  monthGrid,
} from '../src/index.js';

describe('monthGrid', () => {
  it('lays out Shrawan 2083 from Sunday', () => {
    const weeks = monthGrid(2083, 4);
    expect(weeks).toHaveLength(6);
    // 1 Shrawan 2083 is a Friday.
    expect(weeks[0]![5]).toEqual({
      date: BsDate.of(2083, 4, 1),
      inMonth: true,
    });
    expect(weeks[0]![0]).toEqual({
      date: BsDate.of(2083, 3, 28),
      inMonth: false,
    });
    expect(weeks[5]![0]!.date.toString()).toBe('2083-04-31');
  });

  it('can start weeks on another day', () => {
    const weeks = monthGrid(2083, 4, { weekStartsOn: 1 });
    expect(weeks[0]![4]!.date.toString()).toBe('2083-04-01');
    for (const week of weeks) expect(week[0]!.date.weekday).toBe(1);
  });

  it('holds every day of every month once, in order', () => {
    for (const year of [BS_MIN_YEAR + 1, 2000, 2083, 2150, BS_MAX_YEAR - 1]) {
      for (let month = 1; month <= 12; month++) {
        for (const weekStartsOn of [0, 1, 6]) {
          const weeks = monthGrid(year, month, { weekStartsOn });
          const cells = weeks.flat();
          expect(weeks.length).toBeGreaterThanOrEqual(4);
          expect(weeks.length).toBeLessThanOrEqual(6);
          weeks.forEach((week) => expect(week).toHaveLength(7));
          // Consecutive days, starting on the chosen weekday.
          cells.forEach((cell, i) => {
            expect(cell!.date.weekday).toBe((weekStartsOn + i) % 7);
            if (i > 0)
              expect(cell!.date.diffInDays(cells[i - 1]!.date)).toBe(1);
          });
          const days = cells.filter((c) => c!.inMonth).map((c) => c!.date.day);
          const length = BsDate.of(year, month, 1).daysInMonth;
          expect(days).toEqual(Array.from({ length }, (_, i) => i + 1));
          // The first and last weeks hold days of the month.
          expect(weeks[0]!.some((c) => c!.inMonth)).toBe(true);
          expect(weeks.at(-1)!.some((c) => c!.inMonth)).toBe(true);
        }
      }
    }
  });

  it('leaves days outside the supported range empty', () => {
    const first = monthGrid(BS_MIN_YEAR, 1).flat();
    const leading = first.findIndex((c) => c !== null);
    expect(first.slice(0, leading).every((c) => c === null)).toBe(true);
    expect(first[leading]!.date.toString()).toBe(`${BS_MIN_YEAR}-01-01`);

    const last = monthGrid(BS_MAX_YEAR, 12).flat();
    expect(last.filter((c) => c?.inMonth)).toHaveLength(
      BsDate.of(BS_MAX_YEAR, 12, 1).daysInMonth,
    );
  });

  it('rejects bad arguments', () => {
    expect(() => monthGrid(2083, 4, { weekStartsOn: 7 })).toThrow(RangeError);
    expect(() => monthGrid(BS_MAX_YEAR + 1, 1)).toThrow(DateOutOfRangeError);
  });
});
