import { useMemo, useState, type ReactNode } from 'react';
import { cubicageM3, measuresOf, type CubicageMeasureKey, type CubicageMeasures, type TruckShape } from '../flota/cubicage';
import { truckShapeOf } from '../flota/shape';
import { DispatchCard, MeasuresCard, ResponsibleRow, ShapeCard, formatM3 } from './cards';
import { useCubicarKit } from './kit';

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

const useUnitForm = (unit?: CubicarUnit) => {
  const [shape, setShape] = useState<TruckShape | ''>(truckShapeOf(unit?.shape));
  const [plate, setPlate] = useState(unit?.plate ?? '');
  const [cubicator, setCubicator] = useState(unit?.cubicator ?? '');
  const [typed, setTyped] = useState<CubicageMeasures>(unit?.measures ?? {});
  const measures = useMemo(() => (shape ? measuresOf(shape, typed) : typed), [shape, typed]);
  const type = (key: CubicageMeasureKey, value: string) => setTyped((current) => ({ ...current, [key]: value }));
  return { shape, setShape, plate, setPlate, cubicator, setCubicator, measures, type, m3: shape ? cubicageM3(shape, measures) : 0 };
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const lastCubicageLine = (unit?: CubicarUnit): string => {
  if (!unit?.cubicageUpdatedAt) return unit ? `${unit.plate} · sin cubicaje guardado` : 'Unidad nueva';
  const day = new Date(unit.cubicageUpdatedAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${unit.plate} · último cubicaje ${day}`;
};

const SaveBar = ({ disabled, saving, onSave, unit }: { disabled: boolean; saving: boolean; onSave(): void; unit?: CubicarUnit }) => {
  const { Button } = useCubicarKit();
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
      <Button type="button" className="h-12 w-full text-base" disabled={disabled} onClick={onSave}>
        <CheckIcon />
        {saving ? 'Guardando...' : 'Guardar cubicaje'}
      </Button>
      <p className="mt-2 text-center font-mono text-xs text-muted-foreground">{lastCubicageLine(unit)}</p>
    </div>
  );
};

const PlateField = ({ value, locked, onChange }: { value: string; locked: boolean; onChange(value: string): void }) => {
  const { Input } = useCubicarKit();
  return (
    <label className="block space-y-1.5 text-sm font-semibold">
      <span>Placa</span>
      <Input aria-label="Placa" placeholder="ABC-123" className="font-mono" disabled={locked} value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} />
    </label>
  );
};

/** A dispatch height someone worked out on the form (Portal sends it as an alert). */
export interface DispatchHeightCalculation {
  plate: string;
  shape: TruckShape;
  cubicator: string;
  m3: number;
  requestedM3: number;
  heightToDispatchCm: number;
  heightFromTopCm: number;
}

export interface CubicageEditorProps {
  unit?: CubicarUnit;
  responsible?: string;
  saving: boolean;
  onSave(form: CubicarForm): void;
  /** Fires once the requested volume settles into a height, not on every keystroke. */
  onDispatchHeight?(calculation: DispatchHeightCalculation): void;
  picker?: ReactNode;
  notice?: ReactNode;
}

export const CubicageEditor = ({ unit, responsible, saving, onSave, onDispatchHeight, picker, notice }: CubicageEditorProps) => {
  const form = useUnitForm(unit);
  const { shape, plate, cubicator, measures, m3 } = form;
  return (
    <div className="space-y-4 pb-28 lg:pb-0">
      {unit?.pendingCubicageRegularization ? <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm font-medium text-warning">Provisorio: nació de un despacho. Mídela para regularizarla.</p> : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:items-start">
        <div className="space-y-4">
          {picker}
          <ShapeCard shape={shape} onPick={form.setShape}>
            {shape ? (
              <>
                <PlateField value={plate} locked={Boolean(responsible && unit)} onChange={form.setPlate} />
                <ResponsibleRow responsible={responsible} value={cubicator} onChange={form.setCubicator} />
              </>
            ) : null}
          </ShapeCard>
          {shape ? <MeasuresCard shape={shape} measures={measures} onType={form.type} m3={m3} /> : null}
          {shape && m3 <= 0 && unit?.m3 ? <p className="text-center text-sm text-muted-foreground">{`Cubicaje guardado: ${formatM3(unit.m3)}. Ingresa las medidas para actualizarlo.`}</p> : null}
        </div>
        {shape ? (
          <div className="space-y-4 lg:sticky lg:top-4">
            {notice}
            {m3 > 0 ? (
              <DispatchCard
                shape={shape}
                measures={measures}
                m3={m3}
                onHeight={onDispatchHeight ? (height) => onDispatchHeight({ plate, shape, cubicator: responsible ?? cubicator, m3, requestedM3: height.m3, heightToDispatchCm: height.loadCm, heightFromTopCm: height.fromTopCm }) : undefined}
              />
            ) : null}
            <SaveBar disabled={saving || m3 <= 0} saving={saving} onSave={() => onSave({ plate, cubicator, shape, measures })} unit={unit} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
