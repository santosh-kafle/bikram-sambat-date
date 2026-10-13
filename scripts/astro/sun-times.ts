/**
 * Sunrise and sunset in Kathmandu, by NOAA's low-precision solar formulas
 * (accurate to a minute or two, which is all the month rule needs).
 * Build-time only.
 */

const KATHMANDU_LATITUDE = 27.7172;
const KATHMANDU_LONGITUDE = 85.324;
/** Nepal Standard Time is UT+5:45. */
const NPT_HOURS = 5.75;
/** Upper limb on the horizon, with standard refraction. */
const HORIZON = -0.833;

const RADIAN = Math.PI / 180;

/** Julian Day at RD day number 0's midnight UT. */
const RD_TO_JD = 1721424.5;

export interface SunTimes {
  /** Sunrise, in hours after midnight NPT. */
  sunrise: number;
  /** Sunset, in hours after midnight NPT. */
  sunset: number;
}

/** Kathmandu sunrise and sunset on an RD day number. */
export function kathmanduSunTimes(dayNumber: number): SunTimes {
  // Evaluate the Sun at local noon of the day.
  const n = dayNumber + RD_TO_JD + (12 - NPT_HOURS) / 24 - 2451545;
  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const meanAnomaly = (357.528 + 0.9856003 * n) * RADIAN;
  const eclipticLongitude =
    (meanLongitude +
      1.915 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly)) *
    RADIAN;
  const obliquity = (23.439 - 0.0000004 * n) * RADIAN;
  const declination = Math.asin(
    Math.sin(obliquity) * Math.sin(eclipticLongitude),
  );
  const rightAscension =
    Math.atan2(
      Math.cos(obliquity) * Math.sin(eclipticLongitude),
      Math.cos(eclipticLongitude),
    ) / RADIAN;
  // Equation of time, in minutes.
  const equationOfTime =
    4 * (((((meanLongitude - rightAscension) % 360) + 540) % 360) - 180);

  const latitude = KATHMANDU_LATITUDE * RADIAN;
  const hourAngle =
    Math.acos(
      (Math.sin(HORIZON * RADIAN) -
        Math.sin(latitude) * Math.sin(declination)) /
        (Math.cos(latitude) * Math.cos(declination)),
    ) / RADIAN;
  const noon = 12 - KATHMANDU_LONGITUDE / 15 - equationOfTime / 60 + NPT_HOURS;
  return { sunrise: noon - hourAngle / 15, sunset: noon + hourAngle / 15 };
}
