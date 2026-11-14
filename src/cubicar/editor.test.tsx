/** @jest-environment @happy-dom/jest-environment */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes } from 'react';
import { CubicageEditor, type CubicarUnit } from './editor';
import { CubicarKitProvider, type CubicarKit } from './kit';

const onSave = jest.fn();

const UNIT: CubicarUnit = { _id: 'u-1', plate: 'B4X-836', m3: 12, cubicator: 'Ana', shape: 'Cuadrado', measures: { totalWidth: '2', totalLength: '4', totalHeight: '1.5' } };

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

type Props = Partial<Parameters<typeof CubicageEditor>[0]>;
const Editor = (props: Props) => <CubicageEditor saving={false} onSave={onSave} {...props} />;

beforeEach(() => {
  onSave.mockReset();
});
describe('CubicageEditor', () => {
  it('from Lilachat, shows who signs and does not let it change', () => {
    render(<Editor responsible="Ana" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cuadrado' }));

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('lo pone Lilachat')).toBeTruthy();
    expect(screen.queryByLabelText('Responsable')).toBeNull();
    expect((screen.getByLabelText('Placa') as HTMLInputElement).disabled).toBe(false);
  });

  it('from Lilachat, keeps the plate of a registered unit', () => {
    render(<Editor unit={UNIT} responsible="Ana" />);

    expect((screen.getByLabelText('Placa') as HTMLInputElement).disabled).toBe(true);
  });

  it('asks for the shape first', () => {
    render(<Editor />);

    expect(screen.queryByLabelText('Placa')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cuadrado' }));
    expect(screen.getByLabelText('Placa')).toBeTruthy();
  });

  it('shows the volume while typing, and hands the form to the app to save', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Cuadrado' }));
    type('Placa', 'abc-123');
    type('Responsable', 'Ana');
    type('A1 Ancho', '2');
    type('A2 Largo', '4');
    type('A3 Alto', '1');

    expect(screen.getByText('8.00 m³')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Guardar cubicaje/ }));

    expect(onSave).toHaveBeenCalledWith({ plate: 'ABC-123', cubicator: 'Ana', shape: 'Cuadrado', measures: { totalWidth: '2', totalLength: '4', totalHeight: '1' } });
  });

  it('does not let save a truck without volume', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Cuadrado' }));

    expect((screen.getByRole('button', { name: /Guardar cubicaje/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves a registered unit with what it had, and waits while saving', () => {
    const { rerender } = render(<Editor unit={UNIT} />);

    fireEvent.click(screen.getByRole('button', { name: /Guardar cubicaje/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ plate: 'B4X-836', shape: 'Cuadrado' }));

    rerender(<Editor unit={UNIT} saving />);
    expect((screen.getByRole('button', { name: /Guardando/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('deduces and locks the measures of a concave truck', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Cóncavo' }));
    type('A3 Alto', '1.5');
    type('A5 Alto cuadrado', '1');

    const curved = screen.getByLabelText('A4 Alto cóncavo') as HTMLInputElement;
    expect(curved.value).toBe('0.5');
    expect(curved.disabled).toBe(true);
  });

  it('opens a copied row with a shape it does not know, asking for one', () => {
    render(<Editor unit={{ ...UNIT, shape: 'Tolva' }} />);

    expect(screen.queryByLabelText('Placa')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cuadrado' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('reads the shape of a copied row, and shows what it had when its measures are missing', () => {
    render(<Editor unit={{ ...UNIT, shape: 'Square', m3: 9.5, measures: undefined }} />);

    expect(screen.getByRole('button', { name: 'Cuadrado' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Cubicaje guardado: 9.50 m³. Ingresa las medidas para actualizarlo.')).toBeTruthy();
  });

  it('tells a provisional unit is waiting for its measure', () => {
    render(<Editor unit={{ ...UNIT, pendingCubicageRegularization: true }} />);

    expect(screen.getByText('Provisorio: nació de un despacho. Mídela para regularizarla.')).toBeTruthy();
  });

  it('gives the load height for a volume', () => {
    render(<Editor unit={UNIT} />);

    type('Quiero despachar (m³)', '6');

    expect(screen.getByText('75 cm de carga')).toBeTruthy();
    expect(screen.getByText('75 cm desde arriba')).toBeTruthy();
  });

  it('draws with the shadcn primitives and the drawings of the app that hosts it', () => {
    const Button = (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button data-kit="app" {...props} />;
    const kit: CubicarKit = { Button, Card: (props) => <div {...props} />, CardContent: (props) => <div {...props} />, Input: (props) => <input {...props} />, assetOrigin: 'https://inframaq.test' };
    render(
      <CubicarKitProvider kit={kit}>
        <Editor unit={UNIT} />
      </CubicarKitProvider>,
    );

    expect(screen.getByRole('button', { name: /Guardar cubicaje/ }).getAttribute('data-kit')).toBe('app');
    expect(screen.getByAltText('Volquete cuadrado con sus cotas').getAttribute('src')).toBe('https://inframaq.test/img/cubicar/volquete-cuadrado.png');
  });
});
