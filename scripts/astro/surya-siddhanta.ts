/**
 * The Sun's true sidereal longitude by the Sūrya Siddhānta, the classical
 * astronomy Nepal's Panchanga Nirnayak Samiti uses for the Bikram Sambat
 * calendar. Build-time only: the library ships the table this produces,
 * never this code.
 *
 * Two variants are implemented so that calibration can compare them:
 *
 * - `fixed-apogee`: the Sun's apogee fixed at 77°17′ and exact sines, as in
 *   OSN.NepaliCalendar's model of the Samiti's panchang
 *   (github.com/Unicodist/OSN.NepaliCalendar, tools/nepal-sambat/model.py).
 * - `calendrical-calculations`: Reingold & Dershowitz's
 *   `hindu-solar-longitude` (Calendrical Calculations, 4th ed., ch. 20), with
 *   the classical 24-entry sine table and a slowly moving apogee.
 *
 * Moments are Julian Days in Universal Time.
 */

/** Ujjain's longitude, the Sūrya Siddhānta's prime meridian, in degrees east. */
export const UJJAIN_LONGITUDE = 75.7683;

/**
 * The Kali Yuga epoch, mean midnight at Ujjain at the start of 18 February
 * 3102 BCE (Julian), as a Julian Day in UT.
 */
export const KALI_EPOCH_JD = 588465.5 - UJJAIN_LONGITUDE / 360;

/** Civil days, and the Sun's sidereal revolutions, in a mahāyuga. */
const CIVIL_DAYS_PER_MAHAYUGA = 1_577_917_828;
const SUN_REVOLUTIONS_PER_MAHAYUGA = 4_320_000;

/** The sidereal year, about 365.258756 days. */
export const SIDEREAL_YEAR =
  CIVIL_DAYS_PER_MAHAYUGA / SUN_REVOLUTIONS_PER_MAHAYUGA;

export type SunModel = 'fixed-apogee' | 'calendrical-calculations';

const RADIAN = Math.PI / 180;
const frac = (x: number) => x - Math.floor(x);
const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;

/** Mean sidereal longitude of the Sun, `ah` days after the Kali epoch. */
const meanLongitude = (ah: number) => 360 * frac(ah / SIDEREAL_YEAR);

// --- fixed-apogee -----------------------------------------------------------

const SUN_APOGEE = 77 + 17 / 60;

/**
 * The manda (equation of centre) correction. The Sun's epicycle is 14° at
 * the apsides and shrinks to 13°40′ at quadrature.
 */
function fixedApogeeLongitude(ah: number): number {
  const mean = meanLongitude(ah);
  const anomaly = (mean - SUN_APOGEE) * RADIAN;
  const epicycle = 14 - (1 / 3) * Math.abs(Math.sin(anomaly));
  const equation = Math.asin((epicycle / 360) * Math.sin(anomaly)) / RADIAN;
  return normalize(mean - equation);
}

// --- calendrical-calculations ---------------------------------------------

/** The anomalistic year: the apogee makes 387 revolutions per kalpa. */
const ANOMALISTIC_YEAR = 1_577_917_828_000 / (4_320_000_000 - 387);

/**
 * Anomalistic revolutions completed between creation (1,955,880,000
 * sidereal years before the Kali epoch) and the Kali epoch, as a fraction.
 * Computed with exact integers, because the full count is too large for a
 * double to keep its fraction.
 */
const ANOMALY_AT_KALI_EPOCH = (() => {
  // 1955880000 · (394479457 / 1080000) / (1577917828000 / 4319999613)
  const numerator = 1_955_880_000n * 394_479_457n * 4_319_999_613n;
  const denominator = 1_080_000n * 1_577_917_828_000n;
  const scale = 10n ** 15n;
  return Number(((numerator % denominator) * scale) / denominator) / 1e15;
})();

/** The classical sine table: 24 entries, every 3°45′, in units of 3438′. */
const STEP = 225 / 60;
function sineTable(entry: number): number {
  const exact = 3438 * Math.sin(entry * STEP * RADIAN);
  const error = 0.215 * Math.sign(exact) * Math.sign(Math.abs(exact) - 1716);
  return Math.round(exact + error) / 3438;
}

function hinduSine(degrees: number): number {
  const entry = degrees / STEP;
  const fraction = frac(entry);
  return (
    fraction * sineTable(Math.ceil(entry)) +
    (1 - fraction) * sineTable(Math.floor(entry))
  );
}

function hinduArcsine(amplitude: number): number {
  if (amplitude < 0) return -hinduArcsine(-amplitude);
  let position = 0;
  while (amplitude > sineTable(position)) position++;
  const below = sineTable(position - 1);
  return (
    STEP * (position - 1 + (amplitude - below) / (sineTable(position) - below))
  );
}

function calendricalCalculationsLongitude(ah: number): number {
  const anomaly = hinduSine(
    360 * frac(ah / ANOMALISTIC_YEAR + ANOMALY_AT_KALI_EPOCH),
  );
  const size = 14 / 360;
  const contraction = Math.abs(anomaly) * (1 / 42) * size;
  const equation = hinduArcsine(anomaly * (size - contraction));
  return normalize(meanLongitude(ah) - equation);
}

// ---------------------------------------------------------------------------

/** The Sun's true sidereal longitude, in degrees, at a Julian Day (UT). */
export function sunLongitude(jd: number, model: SunModel): number {
  const ah = jd - KALI_EPOCH_JD;
  return model === 'fixed-apogee'
    ? fixedApogeeLongitude(ah)
    : calendricalCalculationsLongitude(ah);
}
