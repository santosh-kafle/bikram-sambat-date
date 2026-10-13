/**
 * Saṅkrāntis (the Sun entering a sidereal sign) and the Nepali rule that
 * turns them into month start dates. Build-time only.
 *
 * The rule, found by matching 1,308 verified months (see docs/projection.md):
 * a BS month starts on the civil day, midnight to midnight in Nepal Standard
 * Time, on which its saṅkrānti falls, except that
 *   - Shrawan (Karka saṅkrānti) starts the day before when the saṅkrānti
 *     comes before Kathmandu sunrise, and
 *   - Magh (Makara saṅkrānti) starts the day after when the saṅkrānti comes
 *     after Kathmandu sunset.
 * This is the classical puṇya-kāla rule: the holy period of the Karka
 * saṅkrānti precedes it, and that of the Makara saṅkrānti follows it.
 */
import { gregorianToDayNumber } from '../../src/core/gregorian.js';
import { type SunModel, sunLongitude } from './surya-siddhanta.js';
import { kathmanduSunTimes } from './sun-times.js';

/** Julian Day of RD day number 0's midnight UT. */
const RD_TO_JD = 1721424.5;
/** Nepal Standard Time is UT+5:45. */
const NPT_DAYS = 5.75 / 24;

const SHRAWAN = 4;
const MAGH = 10;

export interface ProjectionOptions {
  model: SunModel;
  /** Minutes added to every saṅkrānti before the rule is applied. */
  offsetMinutes: number;
}

/**
 * The moment (Julian Day, UT) the Sun enters the sign that starts BS month
 * `month` of `bsYear`: Mesha (0°) for Baisakh, Vrishabha (30°) for Jestha,
 * and so on.
 */
export function sankrantiJd(
  bsYear: number,
  month: number,
  model: SunModel,
): number {
  const target = 30 * (month - 1);
  // Baisakh begins in mid-April of AD year bsYear − 57; months are about
  // 30.44 days apart. The true moment lies within 20 days of this guess.
  const guess =
    gregorianToDayNumber(bsYear - 57, 4, 14) + RD_TO_JD + (month - 1) * 30.44;
  // Signed angle from the target, increasing through zero at the saṅkrānti.
  const distance = (jd: number) =>
    ((sunLongitude(jd, model) - target + 540) % 360) - 180;
  let low = guess - 20;
  let high = guess + 20;
  // 40 halvings of 40 days is well under a second.
  for (let i = 0; i < 40; i++) {
    const middle = (low + high) / 2;
    if (distance(middle) < 0) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export interface MonthStart {
  /** RD day number of the month's first day. */
  dayNumber: number;
  /**
   * Minutes between the saṅkrānti and the nearest boundary the rule tests
   * (midnight, or sunrise/sunset for Shrawan/Magh). A small margin means a
   * small error in the model could move the month by a day.
   */
  marginMinutes: number;
}

/** The first day of BS month `month` of `bsYear`, by the Nepali rule. */
export function monthStart(
  bsYear: number,
  month: number,
  options: ProjectionOptions,
): MonthStart {
  return applyMonthRule(
    sankrantiJd(bsYear, month, options.model),
    month,
    options.offsetMinutes,
  );
}

/**
 * The first day of BS month `month`, given the moment of its saṅkrānti
 * (Julian Day, UT). Separate from `monthStart` so calibration can try many
 * offsets without recomputing saṅkrāntis.
 */
export function applyMonthRule(
  sankranti: number,
  month: number,
  offsetMinutes: number,
): MonthStart {
  const moment = sankranti - RD_TO_JD + NPT_DAYS + offsetMinutes / 1440;
  const civilDay = Math.floor(moment);
  const hour = (moment - civilDay) * 24;

  const boundaries = [0, 24];
  let dayNumber = civilDay;
  if (month === SHRAWAN) {
    const { sunrise } = kathmanduSunTimes(civilDay);
    boundaries.push(sunrise);
    if (hour < sunrise) dayNumber = civilDay - 1;
  } else if (month === MAGH) {
    const { sunset } = kathmanduSunTimes(civilDay);
    boundaries.push(sunset);
    if (hour > sunset) dayNumber = civilDay + 1;
  }
  const marginMinutes = Math.min(
    ...boundaries.map((b) => Math.abs(hour - b) * 60),
  );
  return { dayNumber, marginMinutes };
}
