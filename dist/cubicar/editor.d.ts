import { type ReactNode } from 'react';
import { type CubicageMeasures, type TruckShape } from '../flota/cubicage';
/**
 * «Cubicar volquete» (Stitch `p01`): shape, measures in meters and the dispatch height in
 * centimeters of the unit picked in the list. The same form in Portal and Inframaq (José,
 * 14/11/2026); `onSave` is the app's own, so each one writes its own base. `responsible` is who
 * came from Lilachat: the server signs with that name, and they do not rename a unit.
 */
/** A row copied from another app may lack everything but the plate, and say anything in `shape`. */
export interface CubicarUnit {
    _id: string;
    plate: string;
    m3?: number;
    cubicator?: string;
    shape?: string;
    measures?: CubicageMeasures;
    cubicageUpdatedAt?: string;
    pendingCubicageRegularization?: boolean;
}
export interface CubicarForm {
    plate: string;
    cubicator: string;
    shape: TruckShape;
    measures: CubicageMeasures;
}
export interface CubicageEditorProps {
    unit?: CubicarUnit;
    responsible?: string;
    saving: boolean;
    onSave(form: CubicarForm): void;
    picker?: ReactNode;
    notice?: ReactNode;
}
export declare const CubicageEditor: ({ unit, responsible, saving, onSave, picker, notice }: CubicageEditorProps) => import("react").JSX.Element;
