/**
 * Which m²/m³ of a measurement are STORED on the report photo.
 *
 * It exists because of the Globofast incident (30/09/2026): «17.05 m² · 0.631 m³»
 * for a 4.81 hole. Without diagonals the engine shows the cyclic ceiling (S ≤),
 * correct as a bound and equal to reality for a rectangle, but for a strip with
 * a break it opens up to 2–4× the area. That ceiling was stored as `areaM2`,
 * multiplied by the thickness and added to the quantities table.
 *
 * BOTH places that persist (the admin dialog and the field editor) go through
 * here, so the contract lives in one place: **only what was measured is
 * stored**. The ceiling (≤) and the camera estimate (≈) stay on screen as a guide.
 *
 * Tri-state, because the consumer merges over the stored photo:
 * - `number`    → set it.
 * - `null`      → CLEAR what was stored. There is a drawn but unmeasured shape:
 *                 the old number (a ceiling, or a typed value the shape
 *                 contradicts) cannot survive. Without this, re-measuring a
 *                 Globofast photo kept the 17.05.
 * - `undefined` → leave it. Without a shape there is no opinion: the m² typed
 *                 inline in the IAA is kept.
 */
import type { MeasurementMetrics } from './photoMeasurement';
export type PersistedMetric = number | null | undefined;
export interface PersistedPhotoMetrics {
    areaM2: PersistedMetric;
    volumeM3: PersistedMetric;
}
export declare const persistedPhotoMetrics: (metrics: MeasurementMetrics) => PersistedPhotoMetrics;
/** Applies the tri-state over the value stored on the photo. */
export declare const applyPersistedMetric: (next: PersistedMetric, current: number | undefined) => number | undefined;
