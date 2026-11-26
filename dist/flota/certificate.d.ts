import { type CubicageMeasures, type TruckShape } from './cubicage';
import { type DispatchCm } from './dispatchHeights';
/**
 * The cubicage certificate (Stitch `p02`, José 13/11/2026), the same in Portal and Inframaq. The
 * parts of the volume are the page's own formula split in three, and the dispatch table asks
 * `dispatchHeight` for whole m³ below the volume. The logo is the one of the company that issues
 * the page (José, 14/11/2026: the one that dispatches); when another company measured the truck,
 * `measuredBy` says which and when.
 */
export interface CubicageCertificateMeasure {
    code: string;
    label: string;
    meters: number;
    /** How a measure nobody types is deduced, e.g. «A3 − A5». Absent when it was measured. */
    formula?: string;
}
export interface CubicageCertificatePart {
    label: string;
    formula: string;
    m3: number;
}
export interface CubicageCertificateIssuer {
    name: string;
    address: string;
    logoUrl: string;
    /** RUC, printed under the name when the company has it. */
    taxId?: string;
    /** The company's brand color (its own data, e.g. `#0f766e`): the accent of the sheet. */
    accent?: string;
}
export interface CubicageCertificateView {
    /** Absent when the truck has no numbered certificate (Portal's own fleet): the sheet leaves it out. */
    number?: string;
    plate: string;
    shape: TruckShape;
    shapeLabel: string;
    cubicator: string;
    /** Absent when nobody knows when it was measured: the sheet does not make a date up. */
    measuredAt?: string;
    previous?: {
        m3: number;
        at?: string;
    };
    issuer: CubicageCertificateIssuer;
    /** Another company measured the truck: its frozen name. */
    measuredBy?: {
        companyName: string;
    };
    /** Absolute: the print sheet loads without a base address, so a relative image breaks. */
    figureUrl: string;
    measures: CubicageCertificateMeasure[];
    /** The measures that count for the shape, for drawing the hopper with its dimensions. */
    figure: CubicageMeasures;
    parts: CubicageCertificatePart[];
    m3: number;
    dispatch: DispatchCm[];
}
export interface CubicageCertificateInput {
    number?: string;
    plate: string;
    shape: TruckShape;
    cubicator: string;
    measuredAt?: Date | string;
    m3: number;
    measures: CubicageMeasures;
    previous?: {
        m3?: number;
        at?: Date | string;
    };
}
export interface CubicageCertificateOptions {
    issuer: CubicageCertificateIssuer;
    /** Where the issuing app serves its drawings, e.g. `https://inframaq.constroad.com`. */
    origin: string;
    measuredBy?: {
        companyName: string;
    };
}
export declare const certificateFigureUrl: (origin: string, shape: TruckShape) => string;
/** The deduced measures are worked out here too: a stored row may carry only the measured ones. */
export declare const certificateViewOf: (input: CubicageCertificateInput, options: CubicageCertificateOptions) => CubicageCertificateView;
