import type { StreetProgressEvent } from './streetProgress';

/**
 * The days a work had activity, numbered.
 *
 * It is the "día 1 / día 2 / día 3" the Civil 3D drawing drew by hand, and here
 * it comes for free: events are dated, so the work can be rebuilt at any date.
 * It feeds the client report's slider.
 *
 * Only APPROVED work counts: the client is not shown what the resident
 * engineer has not reviewed yet.
 */

export interface ProgressDay {
  /** `YYYY-MM-DD`. */
  date: string;
  /** 1 for the first working day, 2 for the next… */
  dayNumber: number;
}

export const progressDays = (events: StreetProgressEvent[]): ProgressDay[] => {
  const dates = new Set<string>();
  (events ?? [])
    .filter((event) => event.status === 'approved')
    .forEach((event) => {
      if (event.date) dates.add(event.date);
    });

  // Sort by STRING: comparing ISO date-only values is safe and avoids the
  // one-day shift that building a `Date` causes (portal-pitfalls §1).
  return Array.from(dates)
    .sort((left, right) => left.localeCompare(right))
    .map((date, index) => ({ date, dayNumber: index + 1 }));
};
