/** Text stamped on every page shown without download: which link (and who) it leaked from. */

export const WATERMARK_MAX_LENGTH = 120;
const WATERMARK_TIME_ZONE = 'America/Lima';
const SEPARATOR = ' · ';

const clean = (value: string | undefined): string => (value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

function limaDateTime(at: Date | string | number): string {
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) throw new RangeError('The watermark needs a valid date.');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WATERMARK_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}

/** «Enlace AB12CD · cliente@correo.com · 25/11/2026 14:05», in Lima time; the viewer only when identified. */
export function watermarkText({ linkCode, viewer, at }: { linkCode: string; viewer?: string; at: Date | string | number }): string {
  const link = `Enlace ${clean(linkCode)}`;
  const when = limaDateTime(at);
  const who = clean(viewer);
  if (!who) return `${link}${SEPARATOR}${when}`.slice(0, WATERMARK_MAX_LENGTH);
  const room = WATERMARK_MAX_LENGTH - link.length - when.length - SEPARATOR.length * 2;
  const fitted = room > 0 ? who.slice(0, room) : '';
  return fitted ? `${link}${SEPARATOR}${fitted}${SEPARATOR}${when}` : `${link}${SEPARATOR}${when}`.slice(0, WATERMARK_MAX_LENGTH);
}
