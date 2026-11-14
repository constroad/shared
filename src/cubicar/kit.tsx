import { createContext, useContext, type ButtonHTMLAttributes, type ComponentType, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

/**
 * The shadcn primitives of the app that hosts the form. Portal and Inframaq pass their own
 * `ui-shadcn` Button, Card, CardContent and Input, so the shared form looks like the rest of each
 * app; without a provider it falls back to plain elements (tests, a page without shadcn).
 */

export type KitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline'; size?: 'default' | 'sm' };

export interface CubicarKit {
  Button: ComponentType<KitButtonProps>;
  Card: ComponentType<HTMLAttributes<HTMLDivElement>>;
  CardContent: ComponentType<HTMLAttributes<HTMLDivElement>>;
  Input: ComponentType<InputHTMLAttributes<HTMLInputElement>>;
  /** Where the app serves `/img/cubicar/volquete-*.png`; empty for its own origin. */
  assetOrigin?: string;
}

/** Joins the classes that are set. The form never passes two classes that fight each other. */
export const classes = (...names: Array<string | false | null | undefined>): string => names.filter(Boolean).join(' ');

const PlainButton = ({ variant: _variant, size: _size, className, ...props }: KitButtonProps) => <button className={classes('rounded-md border px-3 py-2', className)} {...props} />;
const PlainCard = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={classes('rounded-xl border bg-card', className)} {...props} />;
const PlainContent = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />;
const PlainInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={classes('w-full rounded-md border px-3 py-2', className)} {...props} />;

const PLAIN_KIT: CubicarKit = { Button: PlainButton, Card: PlainCard, CardContent: PlainContent, Input: PlainInput, assetOrigin: '' };

const KitContext = createContext<CubicarKit>(PLAIN_KIT);

export const CubicarKitProvider = ({ kit, children }: { kit: CubicarKit; children: ReactNode }) => <KitContext.Provider value={kit}>{children}</KitContext.Provider>;

export const useCubicarKit = (): CubicarKit => useContext(KitContext);

export const drawingSrc = (kit: CubicarKit, drawing: string): string => `${kit.assetOrigin ?? ''}/img/cubicar/volquete-${drawing}.png`;

/** The label of a block: mono, uppercase and wide, without needing the app's `.kicker` utility. */
export const KICKER = 'font-mono text-[11px] font-medium uppercase tracking-[0.18em]';
/** Digits of the same width, so columns do not dance. */
export const FIGURES = 'tabular-nums';
