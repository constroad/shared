import { type CubicageMeasureKey, type CubicageMeasures, type TruckShape } from './cubicage';
/**
 * The copy of a truck's cubicage that a dispatch keeps (José, 14/11/2026). The client report and
 * the dispatch card read this copy, never the live unit: a truck measured again later does not
 * change what was dispatched, and a copy does not wait for the plate homologator. Agreed with
 * Portal; the measure keys are Portal's, typo included (`concaveHight`).
 */
export type DispatchCubicageSource = 'local' | 'sibling';
export interface DispatchCubicage {
    plate: string;
    m3: number;
    shape: TruckShape;
    measures: Partial<Record<CubicageMeasureKey, number>>;
    /** Who measured (the `cubicator`). */
    measuredBy?: string;
    measuredByCompanyId: string;
    /** Frozen: the certificate must not change if the company renames itself. */
    measuredByCompanyName: string;
    /** ISO, from the unit's `cubicageUpdatedAt`. */
    measuredAt?: string;
    certificateNumber?: string;
    source: DispatchCubicageSource;
    provisional?: boolean;
    /** ISO, when the dispatch took the copy. */
    capturedAt: string;
}
/** A unit as each company keeps it: Inframaq's `fleetunits` or Portal's `transports` mapped to this. */
export interface CubicageUnit {
    plate: string;
    m3?: number;
    shape?: string;
    measures?: CubicageMeasures | Partial<Record<CubicageMeasureKey, number | string | null>>;
    cubicator?: string;
    cubicageUpdatedAt?: Date | string;
    pendingCubicageRegularization?: boolean;
    certificateNumber?: string;
}
export interface CubicageCandidate {
    companyId: string;
    companyName: string;
    unit: CubicageUnit;
}
/** The local unit is enough unless it has no volume or was born provisional from a dispatch. */
export declare const needsSiblingLookup: (unit: CubicageUnit | null | undefined) => boolean;
/** The newest measured candidate; on a tie the first one wins, so list the local company first. */
export declare const newestCubicage: (candidates: CubicageCandidate[]) => CubicageCandidate | null;
/** Null when the candidate has no volume or no known shape: nothing worth copying. */
export declare const dispatchCubicageOf: (candidate: CubicageCandidate, params: {
    ownCompanyId: string;
    capturedAt: Date;
}) => DispatchCubicage | null;
/** «Medido por INFRAMAQ el 13/11/2026» when another company measured; null when the issuer did. */
export declare const measuredByLine: (copy: DispatchCubicage, issuerCompanyId: string) => string | null;
