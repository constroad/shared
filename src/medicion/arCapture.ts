import { fitTapeScale, thicknessStats, type AreaSource, type PlanPoint, type TapedSide } from './arPlan';

/**
 * What the APK measured with AR for one photo (José, 14/11/2026: «solo APK para medir»): the corners on the floor plane
 * in metres, the sides taped, the thickness readings in cm and the device. It travels inside the photo's measurement,
 * so the server recomputes the area from it and never trusts the phone's number.
 */

export type ArTracking = 'normal' | 'limitado';

export interface ArDevice {
  model: string;
  os: string;
  ar: 'arcore' | 'arkit';
  version: string;
}

export interface ArCapture {
  plan: PlanPoint[];
  tape: TapedSide[];
  thicknessCm: number[];
  tracking?: ArTracking;
  device?: ArDevice;
}

export interface ArCaptureMetrics {
  area: number | null;
  source: AreaSource | null;
  perimeter: number | null;
  /** Mean thickness in metres; null without readings. */
  thicknessM: number | null;
}

const MIN_CORNERS = 3;
const TRACKINGS: ReadonlySet<string> = new Set<ArTracking>(['normal', 'limitado']);
const AR_ENGINES: ReadonlySet<string> = new Set<ArDevice['ar']>(['arcore', 'arkit']);
const DEVICE_TEXT_MAX = 60;

type Loose = Record<string, unknown>;

const isLoose = (value: unknown): value is Loose => typeof value === 'object' && value !== null;

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function planOf(value: unknown): PlanPoint[] | null {
  if (!Array.isArray(value) || value.length < MIN_CORNERS) return null;
  const plan = value.map((point) => (isLoose(point) && finite(point.x) && finite(point.y) ? { x: point.x, y: point.y } : null));
  return plan.every((point): point is PlanPoint => point !== null) ? plan : null;
}

const tapeOf = (value: unknown): TapedSide[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is TapedSide => isLoose(entry) && Number.isInteger(entry.side) && finite(entry.lengthM) && entry.lengthM > 0).map(({ side, lengthM }) => ({ side, lengthM }))
    : [];

const readingsOf = (value: unknown): number[] => (Array.isArray(value) ? value.filter((reading): reading is number => finite(reading) && reading > 0) : []);

const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim().slice(0, DEVICE_TEXT_MAX) : null);

function deviceOf(value: unknown): ArDevice | null {
  if (!isLoose(value)) return null;
  const [model, os, version] = [textOf(value.model), textOf(value.os), textOf(value.version)];
  const engine = typeof value.ar === 'string' && AR_ENGINES.has(value.ar) ? (value.ar as ArDevice['ar']) : null;
  return model && os && version && engine ? { model, os, ar: engine, version } : null;
}

/** The capture as it can be trusted, or null when there is no plan to measure. */
export function normalizeArCapture(input: unknown): ArCapture | null {
  if (!isLoose(input)) return null;
  const plan = planOf(input.plan);
  if (!plan) return null;
  const capture: ArCapture = { plan, tape: tapeOf(input.tape), thicknessCm: readingsOf(input.thicknessCm) };
  if (typeof input.tracking === 'string' && TRACKINGS.has(input.tracking)) capture.tracking = input.tracking as ArTracking;
  const device = deviceOf(input.device);
  if (device) capture.device = device;
  return capture;
}

/** Area from the plan fitted by the tape; the thickness from the readings. */
export function arCaptureMetrics(capture: ArCapture): ArCaptureMetrics {
  const fitted = fitTapeScale(capture.plan, capture.tape);
  if (!fitted.ok) return { area: null, source: null, perimeter: null, thicknessM: null };
  const thickness = thicknessStats(capture.thicknessCm, fitted.areaM2);
  return { area: fitted.areaM2, source: fitted.source, perimeter: fitted.perimeterM, thicknessM: thickness.n > 0 ? thickness.meanM : null };
}
