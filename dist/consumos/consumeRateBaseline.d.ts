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
export declare const sampleRatePerM3: (sample: ConsumeRateSample) => number | null;
export declare const computeRateBaseline: (samples: ConsumeRateSample[], excludeConsumeId?: string, maxSamples?: number) => ConsumeRateBaseline;
/** Variación % del rate actual vs el promedio; null si falta alguno. */
export declare const computeRateVariancePct: (currentRate: number | null, averageRatePerM3: number | null) => number | null;
export declare const exceedsVarianceThreshold: (variancePct: number | null) => boolean;
