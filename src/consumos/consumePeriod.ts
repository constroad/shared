import { formatPeruDate } from './tankMovementDates';

type DateValue = string | Date;

export interface ConsumePeriodFields {
  date: DateValue;
  createdAt?: DateValue;
  periodStart?: DateValue;
  periodEnd?: DateValue;
}

/**
 * Portal filters consumes by the measured period (`periodEnd`, `createdAt` for
 * legacy ones without it). The list shows and sorts by that same date, so a
 * July consume registered today reads as July (31/10/2026).
 */
const periodEndOf = (consume: ConsumePeriodFields): DateValue => consume.periodEnd ?? consume.createdAt ?? consume.date;

export const consumePeriodTime = (consume: ConsumePeriodFields): number => new Date(periodEndOf(consume)).getTime();

export const consumePeriodLabel = (consume: ConsumePeriodFields): string => {
  const end = formatPeruDate(periodEndOf(consume));
  if (!consume.periodStart || !consume.periodEnd) return end;
  const start = formatPeruDate(consume.periodStart);
  return start === end ? end : `${start} – ${end}`;
};
