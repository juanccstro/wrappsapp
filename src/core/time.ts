/**
 * Time helpers. `ts` is wall-clock time stored as if it were UTC, so plain arithmetic gives
 * the hour, weekday and day the people in the chat actually saw. Everything in analytics works
 * at minute resolution: iOS exports seconds and Android does not.
 */
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export const minuteOf = (ts: number): number => Math.floor(ts / MINUTE_MS);
export const dayNumberOf = (ts: number): number => Math.floor(ts / DAY_MS);
export const hourOf = (ts: number): number => Math.floor(ts / HOUR_MS) % 24;
/** 0 = Monday … 6 = Sunday. (1970-01-01 was a Thursday.) */
export const weekdayOf = (ts: number): number => (dayNumberOf(ts) + 3) % 7;
/** "YYYY-MM-DD" for a day number. */
export const dayKeyOf = (dayNumber: number): string =>
  new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
