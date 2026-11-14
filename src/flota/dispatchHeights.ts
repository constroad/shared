import { dispatchHeight, type CubicageMeasures, type TruckShape } from './cubicage';

/**
 * Dispatch heights in CENTIMETERS, as the plant measures them with the tape. `dispatchHeight`
 * answers in meters; Portal printed those meters with «cm» (0.47 «cm» for 47 cm). The screen, the
 * certificate and the Lilachat card read this, so they never disagree.
 */

const CM_PER_M = 100;
const REFERENCE_ROWS = 4;
const REFERENCE_STEP_M3 = 2;

export interface DispatchCm {
  m3: number;
  loadCm: number;
  fromTopCm: number;
}

export const dispatchCm = (shape: TruckShape, measures: CubicageMeasures, m3: number): DispatchCm | null => {
  if (!(m3 > 0)) return null;
  const height = dispatchHeight(shape, measures, m3);
  return height ? { m3, loadCm: Math.round(height.loadHeight * CM_PER_M), fromTopCm: Math.round(height.fromTop * CM_PER_M) } : null;
};

/** Whole m³ every two, from the volume down: what the plant loads most often. */
export const dispatchReference = (shape: TruckShape, measures: CubicageMeasures, volume: number): DispatchCm[] => {
  const top = Math.floor(volume);
  return Array.from({ length: REFERENCE_ROWS }, (_unused, index) => top - REFERENCE_STEP_M3 * (REFERENCE_ROWS - 1 - index))
    .filter((m3) => m3 > 0)
    .flatMap((m3) => {
      const row = dispatchCm(shape, measures, m3);
      return row ? [row] : [];
    });
};
