import { type ReactNode } from 'react';
import { type CubicageMeasureKey, type CubicageMeasures, type TruckShape } from '../flota/cubicage';
import { type DispatchCm } from '../flota/dispatchHeights';
export declare const formatM3: (value: number) => string;
export declare const CardKicker: ({ children, action }: {
    children: ReactNode;
    action?: ReactNode;
}) => import("react").JSX.Element;
export declare const ShapeCard: ({ shape, onPick, children }: {
    shape: TruckShape | "";
    onPick(shape: TruckShape): void;
    children?: ReactNode;
}) => import("react").JSX.Element;
/** Who signs: fixed by the server for whoever came from Lilachat, typed by anyone else. */
export declare const ResponsibleRow: ({ responsible, value, onChange }: {
    responsible?: string;
    value: string;
    onChange(value: string): void;
}) => import("react").JSX.Element;
export declare const MeasuresCard: ({ shape, measures, onType, m3 }: {
    shape: TruckShape;
    measures: CubicageMeasures;
    onType(key: CubicageMeasureKey, value: string): void;
    m3: number;
}) => import("react").JSX.Element;
/** How long a typed volume has to stay before `onHeight` fires: once per calculation, not per keystroke. */
export declare const DISPATCH_HEIGHT_SETTLE_MS = 800;
type DispatchCardProps = {
    shape: TruckShape;
    measures: CubicageMeasures;
    m3: number;
    onHeight?(height: DispatchCm): void;
    children?: ReactNode;
};
export declare const DispatchCard: ({ shape, measures, m3, onHeight, children }: DispatchCardProps) => import("react").JSX.Element;
export {};
