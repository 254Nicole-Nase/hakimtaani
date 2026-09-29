/** Date helpers on ISO calendar dates ("YYYY-MM-DD"), computed in UTC so results never drift by timezone. */

export function parseIsoDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Invalid date: ${iso}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return d;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Adds calendar months, clamping to the last day of the target month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const d = parseIsoDate(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toIso(target);
}

export function addYears(iso: string, years: number): string {
  return addMonths(iso, years * 12);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

/**
 * Completed calendar months worked from `start` to `end`, counting `end` as a
 * worked day (1 Jan – 31 Dec is 12 months).
 */
export function completedMonths(start: string, end: string): number {
  const dayAfterEnd = addDays(end, 1);
  if (daysBetween(start, dayAfterEnd) <= 0) return 0;
  let months = 0;
  while (daysBetween(addMonths(start, months + 1), dayAfterEnd) >= 0) months += 1;
  return months;
}
