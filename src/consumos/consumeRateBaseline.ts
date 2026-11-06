import {
  CONSUME_RATE_BASELINE_SAMPLES,
  CONSUME_RATE_VARIANCE_WARN_PCT,
} from './consumeConstants';

/**
 * KPI gal/m³ contra el histórico (F3 CONSUMES-TANK-RECONCILIATION), estilo
 * "fuel per ton" de plantas de asfalto: promedio de los últimos N consumos por
 * medidas y variación porcentual del consumo actual. Puro y compartido
 * cliente/server: lo consumen el endpoint `rate-baseline`, la alerta de
 * variación y el chip del resumen (ConsumeSummaryCard).
 */

export interface ConsumeRateSample {
  _id?: unknown;
  quantityPen?: number;
  quantityGasohol?: number;
  quantityPetroleo?: number;
  totalCubes?: number;
}

export interface ConsumeRateBaseline {
  /** Promedio gal/m³ de la muestra; null sin datos suficientes. */
  averageRatePerM3: number | null;
  sampleSize: number;
}

export const sampleRatePerM3 = (sample: ConsumeRateSample): number | null => {
  const totalGallons =
    (sample.quantityPen ?? 0) + (sample.quantityGasohol ?? 0) + (sample.quantityPetroleo ?? 0);
  const totalCubes = Number(sample.totalCubes ?? 0);
  if (!(totalCubes > 0) || !(totalGallons > 0)) return null;
  return totalGallons / totalCubes;
};

export const computeRateBaseline = (
  samples: ConsumeRateSample[],
  excludeConsumeId?: string,
  maxSamples: number = CONSUME_RATE_BASELINE_SAMPLES
): ConsumeRateBaseline => {
  const rates = samples
    .filter((sample) => !excludeConsumeId || String(sample._id || '') !== excludeConsumeId)
    .map(sampleRatePerM3)
    .filter((rate): rate is number => rate != null)
    .slice(0, maxSamples);

  if (rates.length === 0) return { averageRatePerM3: null, sampleSize: 0 };
  const average = rates.reduce((total, rate) => total + rate, 0) / rates.length;
  return { averageRatePerM3: Number(average.toFixed(4)), sampleSize: rates.length };
};

/** Variación % del rate actual vs el promedio; null si falta alguno. */
export const computeRateVariancePct = (
  currentRate: number | null,
  averageRatePerM3: number | null
): number | null => {
  if (currentRate == null || averageRatePerM3 == null || averageRatePerM3 <= 0) return null;
  return Number((((currentRate - averageRatePerM3) / averageRatePerM3) * 100).toFixed(1));
};

export const exceedsVarianceThreshold = (variancePct: number | null): boolean =>
  variancePct != null && Math.abs(variancePct) > CONSUME_RATE_VARIANCE_WARN_PCT;
