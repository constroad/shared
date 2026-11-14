import { type ButtonHTMLAttributes, type ComponentType, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
/**
 * The shadcn primitives of the app that hosts the form. Portal and Inframaq pass their own
 * `ui-shadcn` Button, Card, CardContent and Input, so the shared form looks like the rest of each
 * app; without a provider it falls back to plain elements (tests, a page without shadcn).
 */
export type KitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm';
};
export interface CubicarKit {
    Button: ComponentType<KitButtonProps>;
    Card: ComponentType<HTMLAttributes<HTMLDivElement>>;
    CardContent: ComponentType<HTMLAttributes<HTMLDivElement>>;
    Input: ComponentType<InputHTMLAttributes<HTMLInputElement>>;
    /** Where the app serves `/img/cubicar/volquete-*.png`; empty for its own origin. */
    assetOrigin?: string;
}
/** Joins the classes that are set. The form never passes two classes that fight each other. */
export declare const classes: (...names: Array<string | false | null | undefined>) => string;
export declare const CubicarKitProvider: ({ kit, children }: {
    kit: CubicarKit;
    children: ReactNode;
}) => import("react").JSX.Element;
export declare const useCubicarKit: () => CubicarKit;
export declare const drawingSrc: (kit: CubicarKit, drawing: string) => string;
/** The label of a block: mono, uppercase and wide, without needing the app's `.kicker` utility. */
export declare const KICKER = "font-mono text-[11px] font-medium uppercase tracking-[0.18em]";
/** Digits of the same width, so columns do not dance. */
export declare const FIGURES = "tabular-nums";
