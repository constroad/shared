import { resolveClientFacingM3 } from './dispatchClientFacingM3';

/**
 * Where each unit of a Control de pista unloaded (José, 07/11/2026): its photos
 * with GPS, in the order they were taken, so Lilachat can project them on the
 * street and suggest the stretch it paved. No money and no driver: members
 * read it too. Pure.
 */

type DateSource = Date | string | null | undefined;

export type DischargeDispatch = {
  _id: unknown;
  plate?: string;
  quantity?: number;
  planedQuantity?: number;
  placeholders?: { m3Dispatched?: number; m3Truck?: number } | null;
  arrival?: { at?: string } | null;
  fieldWork?: { finishedAt?: unknown } | null;
};

export type UnitPhotoMedia = {
  metadata?: { dispatchId?: string; tipoFoto?: string; geo?: string; precisionM?: string; takenAt?: string };
  createdAt?: DateSource;
};

export type DischargePoint = { kind: string; lat: number; lng: number; precision_m?: number; at: string };
export type Discharge = {
  dispatch_id: string;
  plate: string;
  m3?: number;
  arrival_at?: string;
  finished_at?: string;
  points: DischargePoint[];
};

const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

const isoOf = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const time = new Date(value as string).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
};

const positionOf = (geo: string | undefined): { lat: number; lng: number } | null => {
  const [lat, lng] = String(geo ?? '').split(',').map(Number);
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= MAX_LATITUDE && Math.abs(lng) <= MAX_LONGITUDE;
  return valid ? { lat, lng } : null;
};

/** The photo's taken time; an older photo without one is dated by its upload. */
const pointOf = (photo: UnitPhotoMedia): DischargePoint | null => {
  const position = positionOf(photo.metadata?.geo);
  const at = isoOf(photo.metadata?.takenAt) ?? isoOf(photo.createdAt);
  if (!position || !at) return null;
  const precision = Number(photo.metadata?.precisionM);
  return { kind: String(photo.metadata?.tipoFoto ?? ''), ...position, ...(Number.isFinite(precision) && photo.metadata?.precisionM ? { precision_m: precision } : {}), at };
};

const pointsByDispatch = (photos: UnitPhotoMedia[]): Map<string, DischargePoint[]> => {
  const byDispatch = new Map<string, DischargePoint[]>();
  photos.forEach((photo) => {
    const dispatchId = String(photo.metadata?.dispatchId ?? '');
    const point = pointOf(photo);
    if (dispatchId && point) byDispatch.set(dispatchId, [...(byDispatch.get(dispatchId) ?? []), point]);
  });
  return byDispatch;
};

export const dischargesOf = (dispatches: DischargeDispatch[], photos: UnitPhotoMedia[]): Discharge[] => {
  const points = pointsByDispatch(photos);
  return dispatches.flatMap((dispatch) => {
    const id = String(dispatch._id);
    const own = (points.get(id) ?? []).sort((left, right) => left.at.localeCompare(right.at));
    if (!own.length) return [];
    const m3 = resolveClientFacingM3(dispatch);
    const arrivalAt = isoOf(dispatch.arrival?.at);
    const finishedAt = isoOf(dispatch.fieldWork?.finishedAt);
    return [{
      dispatch_id: id,
      plate: String(dispatch.plate ?? '').toUpperCase(),
      ...(typeof m3 === 'number' && m3 > 0 ? { m3 } : {}),
      ...(arrivalAt ? { arrival_at: arrivalAt } : {}),
      ...(finishedAt ? { finished_at: finishedAt } : {}),
      points: own,
    }];
  });
};
