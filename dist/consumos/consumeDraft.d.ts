import type { ConsumeMovementRecord } from './consumeMovementFlow';
import { type EngineTank } from './consumeEngine';
import { orderRowOf, type DraftAggregates, type DraftPeriod } from './consumeDraftRows';
import { type ConsumeRateBaseline } from './consumeRateBaseline';
import type { ConsumeEngineData, ConsumeSelection } from './consumeRecompute';
/**
 * Wilson's consume from Lilachat (José, 30/10/2026): `preparar_consumo` lists
 * what the screen shows, `revisar_consumo` says what WOULD be saved and
 * `registrar_consumo` saves it through the app's one write path. Each app gives
 * its data through `ConsumeDraftDeps`.
 */
type DraftOrder = Parameters<typeof orderRowOf>[0]['order'];
export interface PeriodOrder {
    order: DraftOrder;
    m3: number;
    dispatchCount: number;
}
export interface ConsumeDraftArgs {
    desde?: string;
    hasta?: string;
    m3Manual?: number;
    nota?: string;
    pedidos: string[];
    tramos: Array<{
        tanqueId: string;
        inicioId?: string;
        finId?: string;
    }>;
}
export interface ConsumeDraftDeps {
    periodOrders(period: DraftPeriod): Promise<PeriodOrder[]>;
    usedOrders(): Promise<Map<string, string>>;
    periodReadings(period: DraftPeriod): Promise<{
        tanks: EngineTank[];
        movements: ConsumeMovementRecord[];
        photoUrlsByMovementId: Record<string, string[]>;
    }>;
    rateBaseline(): Promise<ConsumeRateBaseline>;
    engineData(selection: ConsumeSelection): Promise<ConsumeEngineData>;
    previewAggregates(orders: unknown[]): Promise<DraftAggregates[]>;
    saveConsume(input: unknown): Promise<{
        ok: true;
        consume: {
            _id?: unknown;
        };
        aggregates?: unknown[];
    } | {
        ok: false;
        message: string;
    }>;
    consumeLink(consumeId: string): Promise<string>;
}
export declare function prepareConsume(args: {
    desde?: string;
    hasta?: string;
}, deps: ConsumeDraftDeps): Promise<{
    ok: false;
    message: string;
} | {
    ok: true;
    value: {
        periodo: DraftPeriod;
        pedidos: import("./consumeDraftRows").OrderRow[];
        tanques: {
            id: string;
            nombre: string;
            contenido: string;
        }[];
        lecturas: import("./consumeDraftRows").ReadingRow[];
        promedio: {
            glPorM3: number;
            muestras: number;
        } | null;
        form: {
            defaults: {
                desde: string;
                hasta: string;
                tramos: {
                    tanqueId: string;
                }[];
            };
        };
    };
}>;
export declare function reviewConsume(args: ConsumeDraftArgs, deps: ConsumeDraftDeps): Promise<{
    ok: false;
    message: string;
} | {
    ok: true;
    value: {
        agregados: DraftAggregates[];
        resumen: {
            despachos: number;
            tanques: {
                tanqueId: string;
                nombre: string;
                contenido: string;
                inicioCm: number;
                finCm: number;
                gl: number;
                recargaGl: number;
                glPorM3: number;
            }[];
            totales: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            glPorM3: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            recargasGl: number;
            promedio: {
                glPorM3: number;
                muestras: number;
            } | null;
            m3Manual?: number | undefined;
            m3: number;
            m3Despachados: number;
        };
        avisos: string[];
        conflictos: string[];
        blocks: import("./consumeDraftRows").ReviewBlock[];
    } | {
        agregados?: undefined;
        resumen: {
            despachos: number;
            tanques: {
                tanqueId: string;
                nombre: string;
                contenido: string;
                inicioCm: number;
                finCm: number;
                gl: number;
                recargaGl: number;
                glPorM3: number;
            }[];
            totales: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            glPorM3: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            recargasGl: number;
            promedio: {
                glPorM3: number;
                muestras: number;
            } | null;
            m3Manual?: number | undefined;
            m3: number;
            m3Despachados: number;
        };
        avisos: string[];
        conflictos: string[];
        blocks: import("./consumeDraftRows").ReviewBlock[];
    };
}>;
/** Saves the consume Lila reviewed: same engine, same write path as the screen. */
export declare function registerConsume(args: ConsumeDraftArgs, author: {
    name?: string;
}, deps: ConsumeDraftDeps): Promise<{
    ok: false;
    message: string;
} | {
    ok: true;
    value: {
        agregados: unknown[];
        consumoId: string;
        resumen: {
            despachos: number;
            tanques: {
                tanqueId: string;
                nombre: string;
                contenido: string;
                inicioCm: number;
                finCm: number;
                gl: number;
                recargaGl: number;
                glPorM3: number;
            }[];
            totales: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            glPorM3: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            recargasGl: number;
            promedio: {
                glPorM3: number;
                muestras: number;
            } | null;
            m3Manual?: number | undefined;
            m3: number;
            m3Despachados: number;
        };
        enlace: string;
    } | {
        agregados?: undefined;
        consumoId: string;
        resumen: {
            despachos: number;
            tanques: {
                tanqueId: string;
                nombre: string;
                contenido: string;
                inicioCm: number;
                finCm: number;
                gl: number;
                recargaGl: number;
                glPorM3: number;
            }[];
            totales: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            glPorM3: {
                pen: number;
                gasohol: number;
                petroleo: number;
            };
            recargasGl: number;
            promedio: {
                glPorM3: number;
                muestras: number;
            } | null;
            m3Manual?: number | undefined;
            m3: number;
            m3Despachados: number;
        };
        enlace: string;
    };
}>;
export {};
