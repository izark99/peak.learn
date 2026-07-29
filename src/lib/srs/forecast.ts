import { toDateKey } from "@/lib/utils";

/**
 * The 7-day review forecast shown on the dashboard: how many cards fall due on
 * each of the next N calendar days.
 */
export type ForecastDay = {
  /** YYYY-MM-DD, local time. */
  date: string;
  /** Short weekday label, or "Today" / "Tomorrow". */
  label: string;
  count: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Buckets due dates into consecutive calendar days starting today.
 *
 * Anything already overdue lands in today's bucket — from the learner's point
 * of view a card that was due last Tuesday is simply due now, and showing it as
 * a separate "overdue" column would double-count it.
 */
export function buildForecast(
  dueDates: Array<string | Date>,
  now: Date = new Date(),
  days = 7,
): ForecastDay[] {
  const today = startOfDay(now);

  const buckets: ForecastDay[] = [];
  const indexByKey = new Map<string, number>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const key = toDateKey(date);

    buckets.push({
      date: key,
      label:
        offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : WEEKDAYS[date.getDay()],
      count: 0,
    });
    indexByKey.set(key, offset);
  }

  const horizon = new Date(today);
  horizon.setDate(today.getDate() + days);

  for (const raw of dueDates) {
    const due = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(due.getTime())) continue;

    // Beyond the window — not this week's problem.
    if (due >= horizon) continue;

    // Overdue and due-today both belong to today.
    const key = due < today ? toDateKey(today) : toDateKey(startOfDay(due));
    const index = indexByKey.get(key);
    if (index !== undefined) {
      buckets[index].count += 1;
    }
  }

  return buckets;
}

/** How many cards are answerable right now. */
export function countDue(dueDates: Array<string | Date>, now: Date = new Date()): number {
  return dueDates.reduce<number>((total, raw) => {
    const due = raw instanceof Date ? raw : new Date(raw);
    return !Number.isNaN(due.getTime()) && due <= now ? total + 1 : total;
  }, 0);
}
