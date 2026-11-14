/**
 * Qué m²/m³ de una medición se GUARDAN en la foto del informe.
 *
 * Existe por el incidente Globofast (30/09/2026): «17.05 m² · 0.631 m³» en un
 * hueco de 4.81. El motor, sin diagonales, muestra el techo cíclico (S ≤) —
 * correcto como cota, y para un rectángulo igual a lo real — pero para una
 * franja con un quiebre se abre a 2–4× el área. Ese techo se guardaba como
 * `areaM2`, se multiplicaba por el espesor y se sumaba al cuadro de metrados.
 *
 * Los DOS puntos que persisten (diálogo del admin y editor de campo) pasan por
 * acá, y el contrato queda en un solo lugar: **solo lo medido se guarda**. El
 * techo (≤) y la estimación por cámara (≈) siguen en pantalla como guía.
 *
 * Tri-estado, porque el consumidor mergea sobre la foto guardada:
 * - `number`    → fijar.
 * - `null`      → LIMPIAR lo guardado. Hay forma dibujada pero no medida: el
 *                 número viejo (un techo, o un tecleo que la forma contradice)
 *                 no puede sobrevivir. Sin esto, re-medir una foto de Globofast
 *                 seguía dejando el 17.05.
 * - `undefined` → no tocar. Sin forma no hay opinión: el m² tecleado inline en
 *                 el IAA se conserva.
 */
import type { AreaFuente, MeasurementMetrics } from './photoMeasurement';

/** Lo medido con diagonales, a escuadra o con AR ajustado por la wincha son datos del informe. AR solo no. */
const FUENTES_QUE_SE_GUARDAN: ReadonlySet<AreaFuente> = new Set<AreaFuente>(['medida', 'escuadra', 'ar+wincha']);

export type PersistedMetric = number | null | undefined;

export interface PersistedPhotoMetrics {
  areaM2: PersistedMetric;
  volumeM3: PersistedMetric;
}

/**
 * Cuatro decimales, no los dos que se imprimen: un parche de 0.30 m² a dos
 * decimales ya lleva ±1.7 % de redondeo. El cuadro redondea al mostrar.
 */
const DECIMALES_GUARDADOS = 4;
const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const persistedPhotoMetrics = (metrics: MeasurementMetrics): PersistedPhotoMetrics => {
  if (metrics.areaFuente === null) {
    return { areaM2: undefined, volumeM3: undefined };
  }
  if (!FUENTES_QUE_SE_GUARDAN.has(metrics.areaFuente) || metrics.area === null) {
    return { areaM2: null, volumeM3: null };
  }
  return {
    areaM2: round(metrics.area, DECIMALES_GUARDADOS),
    // Área medida sin espesor: el m³ viejo saldría de OTRA área. Se limpia.
    volumeM3: metrics.volume === null ? null : round(metrics.volume, DECIMALES_GUARDADOS),
  };
};

/** Aplica el tri-estado sobre el valor guardado en la foto. */
export const applyPersistedMetric = (next: PersistedMetric, current: number | undefined): number | undefined => {
  if (next === undefined) return current;
  if (next === null) return undefined;
  return next;
};
