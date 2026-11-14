import { useState, type ReactNode } from 'react';
import { measureFieldsOf, type CubicageMeasureKey, type CubicageMeasures, type TruckShape } from '../flota/cubicage';
import { dispatchCm, dispatchReference } from '../flota/dispatchHeights';
import { drawingOf } from '../flota/shape';
import { classes, drawingSrc, FIGURES, KICKER, useCubicarKit } from './kit';

/**
 * The blocks of «Cubicar volquete» (Stitch `p01`, approved by José 13/11/2026): shape, measures in
 * meters with the deduced ones read-only, the volume, and the dispatch height in centimeters. One
 * form for Portal and Inframaq (José, 14/11/2026); each app saves to its own base.
 */

const M3_DECIMALS = 2;
const SHAPES: Array<{ label: string; value: TruckShape }> = [
  { label: 'Cuadrado', value: 'Cuadrado' },
  { label: 'Cóncavo', value: 'Concavo' },
];

const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
export const formatM3 = (value: number): string => `${value.toFixed(M3_DECIMALS)} m³`;

export const CardKicker = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
    <p className={classes(KICKER, 'text-muted-foreground')}>{children}</p>
    {action}
  </div>
);

/** The cross-section as a line: a box, or a box with a curved bottom. */
const ShapeIcon = ({ shape }: { shape: TruckShape }) => (
  <svg viewBox="0 0 48 28" className="h-7 w-12" aria-hidden="true">
    {shape === 'Cuadrado' ? <rect x="2" y="2" width="44" height="22" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" /> : <path d="M2 2 H46 V12 Q46 26 32 26 H16 Q2 26 2 12 Z" fill="none" stroke="currentColor" strokeWidth="2" />}
  </svg>
);

export const ShapeCard = ({ shape, onPick, children }: { shape: TruckShape | ''; onPick(shape: TruckShape): void; children?: ReactNode }) => {
  const { Card, CardContent } = useCubicarKit();
  return (
  <Card>
    <CardKicker>Forma de tolva</CardKicker>
    <CardContent className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        {SHAPES.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            aria-pressed={shape === value}
            className={classes(
              'flex flex-col items-center gap-2 rounded-lg border-[1.5px] px-3 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              shape === value ? 'border-primary bg-muted text-foreground' : 'border-border text-muted-foreground hover:border-primary/40',
            )}
            onClick={() => onPick(value)}
          >
            <ShapeIcon shape={value} />
            {label}
          </button>
        ))}
      </div>
      {children}
    </CardContent>
  </Card>
  );
};

/** Who signs: fixed by the server for whoever came from Lilachat, typed by anyone else. */
export const ResponsibleRow = ({ responsible, value, onChange }: { responsible?: string; value: string; onChange(value: string): void }) => {
  const { Input } = useCubicarKit();
  return responsible ? (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
      <span>
        <span className="text-muted-foreground">Responsable · </span>
        <strong>{responsible}</strong>
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <LockIcon />
        lo pone Lilachat
      </span>
    </div>
  ) : (
    <label className="block space-y-1.5 text-sm font-semibold">
      <span>Responsable</span>
      <Input aria-label="Responsable" placeholder="Nombre de la persona que cubica" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
};

const MeasureInput = ({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) => (
  <label className="block rounded-lg border-[1.5px] border-border bg-card px-3 py-2 focus-within:border-primary">
    <span className={classes(KICKER, 'block text-muted-foreground')}>{label}</span>
    <span className="mt-1 flex items-baseline gap-2">
      <input aria-label={label} inputMode="decimal" type="number" min={0} step="0.01" className={classes(FIGURES, 'w-full bg-transparent text-lg font-bold outline-none')} value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="text-xs text-muted-foreground">m</span>
    </span>
  </label>
);

const DeducedRow = ({ label, hint, value }: { label: string; hint: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
    <span>
      <span className="block text-sm font-medium">{label}</span>
      <span className="block font-mono text-xs text-muted-foreground">{hint}</span>
    </span>
    <span className={classes(FIGURES, 'text-sm font-semibold text-muted-foreground')}>
      <input aria-label={label} className="w-16 bg-transparent text-right" value={value} disabled readOnly /> m
    </span>
  </div>
);

export const MeasuresCard = ({ shape, measures, onType, m3 }: { shape: TruckShape; measures: CubicageMeasures; onType(key: CubicageMeasureKey, value: string): void; m3: number }) => {
  const fields = measureFieldsOf(shape);
  const kit = useCubicarKit();
  const { Card, CardContent } = kit;
  return (
    <Card>
      <CardKicker>Medidas en metros</CardKicker>
      <CardContent className="space-y-4 p-4">
        <div className="flex justify-center rounded-lg border border-border bg-white p-3">
          <img src={drawingSrc(kit, drawingOf(shape))} width={360} height={180} alt={`Volquete ${drawingOf(shape)} con sus cotas`} className="h-auto w-full max-w-sm object-contain" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {fields.filter((field) => !field.hint).map((field) => (
            <MeasureInput key={field.key} label={field.label} value={measures[field.key] ?? ''} onChange={(value) => onType(field.key, value)} />
          ))}
        </div>
        {fields.some((field) => field.hint) ? (
          <div className="grid gap-2 lg:grid-cols-3">
            {fields.filter((field) => field.hint).map((field) => (
              <DeducedRow key={field.key} label={field.label} hint={field.hint ?? ''} value={measures[field.key] ?? ''} />
            ))}
          </div>
        ) : null}
        {m3 > 0 ? (
          <div className="border-t-[3px] border-accent pt-3 text-center">
            <p className={classes(KICKER, 'text-accent')}>Volquete cubica</p>
            <p className={classes(FIGURES, 'text-4xl font-extrabold tracking-tight')}>{formatM3(m3)}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export const DispatchCard = ({ shape, measures, m3, children }: { shape: TruckShape; measures: CubicageMeasures; m3: number; children?: ReactNode }) => {
  const [requested, setRequested] = useState('');
  const height = Number(requested) <= m3 ? dispatchCm(shape, measures, Number(requested)) : null;
  const reference = dispatchReference(shape, measures, m3);
  const kit = useCubicarKit();
  const { Card, CardContent } = kit;
  return (
    <Card>
      <CardKicker>Altura de despacho</CardKicker>
      <CardContent className="space-y-4 p-4">
        <label className="flex items-center gap-3 rounded-lg border-[1.5px] border-border px-3 py-2">
          <span className={classes(KICKER, 'text-muted-foreground')}>Quiero</span>
          <input aria-label="Quiero despachar (m³)" inputMode="decimal" type="number" min={0} step="0.01" className={classes(FIGURES, 'w-full bg-transparent text-lg font-bold outline-none')} value={requested} onChange={(event) => setRequested(event.target.value)} />
          <span className="text-sm text-muted-foreground">m³</span>
        </label>
        {Number(requested) > m3 ? <p className="text-sm font-medium text-destructive">{`El volquete cubica ${formatM3(m3)}: pide menos.`}</p> : null}
        <div className="relative overflow-hidden rounded-lg border border-border bg-white p-3">
          {height ? (
            <div className="absolute left-[8%] right-[8%] top-[22%] z-10 text-center text-sm font-extrabold text-gray-900">
              <p>{`${height.fromTopCm} cm desde arriba`}</p>
              <div className="my-1 border-t-2 border-dashed border-accent" />
              <p>{`${height.loadCm} cm de carga`}</p>
            </div>
          ) : null}
          <img src={drawingSrc(kit, `${drawingOf(shape)}-result`)} width={360} height={260} alt="Altura de carga del volquete" className="mx-auto h-auto w-full max-w-sm object-contain" />
        </div>
        {reference.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className={classes(KICKER, 'text-muted-foreground')}>
                <th className="py-1 text-left font-semibold">m³</th>
                <th className="py-1 text-right font-semibold">Desde arriba</th>
                <th className="py-1 text-right font-semibold">Carga</th>
              </tr>
            </thead>
            <tbody className={classes(FIGURES, 'divide-y divide-border')}>
              {reference.map((row) => (
                <tr key={row.m3}>
                  <td className="py-1.5 font-semibold">{row.m3}</td>
                  <td className="py-1.5 text-right font-semibold text-accent">{`${row.fromTopCm} cm`}</td>
                  <td className="py-1.5 text-right">{`${row.loadCm} cm`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
};
