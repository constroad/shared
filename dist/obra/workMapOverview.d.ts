import type { ClientWorkStreets } from './clientWorkStreets';
import { type KmStripLegendItem, type KmStripPartidaInput } from './kmStrip';
/**
 * The figures of the «Mapa de la obra» page: overall progress, the lead layer,
 * finished streets, last working day and how far each street got. Everything
 * rewinds with the cut-off date, like the map itself.
 */
export type WorkStreetsPayload = ClientWorkStreets;
export interface WorkMapStreet {
    streetId: string;
    name: string;
    lengthM: number;
    segments: Array<{
        workId: string;
        color: string;
        fromPct: number;
        widthPct: number;
    }>;
    status: string;
    done: boolean;
}
export interface WorkMapOverview {
    progressPct: number;
    lead: {
        label: string;
        value: string;
        unit: string;
    } | null;
    streetsDone: number;
    streetsTotal: number;
    lastDay: {
        date: string;
        number: number;
    } | null;
    activeFront: {
        street: string;
        meters: number;
    } | null;
    layers: KmStripLegendItem[];
    streets: WorkMapStreet[];
}
export declare const workMapOverview: (params: {
    workStreets: WorkStreetsPayload;
    partidas: KmStripPartidaInput[];
    upToDate?: string;
}) => WorkMapOverview;
/** The work narrowed to one stage. An empty id is the whole work. */
export declare const narrowToStage: (workStreets: WorkStreetsPayload, stageId: string) => WorkStreetsPayload;
