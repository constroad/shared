import type { LatLng } from './streetGeometry';
/**
 * The street map for the CLIENT (read-only).
 *
 * It goes through a field whitelist, not by omission: the public payload is
 * built by choosing what goes out, so adding a cost field to the model does not
 * leak by itself. From progress only the measures and the date go out —what is
 * painted and what moves the slider—, never the metrado nor who loaded it.
 */
export interface ClientWorkStreet {
    _id: string;
    name: string;
    geometry: LatLng[];
    lengthM: number;
    /**
     * Roadway width. It joins the whitelist in F5: without it there is no m², and
     * the client report shows «área asfaltada X de Y m²». It is contractual
     * geometry —what the client contracted—, not a cost.
     */
    widthM?: number;
}
export interface ClientWorkScope {
    _id: string;
    streetId: string;
    fromM: number;
    toM: number;
    partidaIds: string[];
    /** The work axis. It wins over the partida for the color (`colorForScope`). */
    tagIds: string[];
    /** Scope width; it wins over the street's (`effectiveWidthM`). */
    widthM?: number;
    stageId?: string;
}
export interface ClientWorkProgress {
    streetId: string;
    partidaId: string;
    /** Present when progress was loaded by tag; then there is no partida. */
    tagId?: string;
    fromM: number;
    toM: number;
    date?: string;
    rework?: boolean;
}
/** The tag as the client sees it: to read the legend, not to edit it. */
export interface ClientWorkTag {
    _id: string;
    name: string;
    color: string;
    order: number;
}
/** A stage of the work, so the client can narrow the map to it. */
export interface ClientWorkStage {
    _id: string;
    name: string;
    order: number;
}
export interface ClientWorkStreets {
    streets: ClientWorkStreet[];
    scopes: ClientWorkScope[];
    progress: ClientWorkProgress[];
    tags: ClientWorkTag[];
    stages: ClientWorkStage[];
}
/** Trims to what the client may see. Pure: security is tested here. */
export declare const toClientWorkStreets: (input: {
    streets: Array<Record<string, unknown>>;
    scopes: Array<Record<string, unknown>>;
    progress: Array<Record<string, unknown>>;
    tags?: Array<Record<string, unknown>>;
    stages?: Array<Record<string, unknown>>;
}) => ClientWorkStreets;
