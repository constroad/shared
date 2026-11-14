/** @jest-environment @happy-dom/jest-environment */
import { render, screen } from '@testing-library/react';
import type { CubicageCertificateView } from '../flota/certificate';
import { CERTIFICATE_CSS, CubicageCertificateSheet } from './certificateSheet';

const VIEW: CubicageCertificateView = {
  number: 'CUB-2026-0031',
  plate: 'ABC-123',
  shape: 'Concavo',
  shapeLabel: 'Cóncavo',
  cubicator: 'Darío Quispe',
  measuredAt: '2026-11-13T14:42:00.000Z',
  previous: { m3: 15.4, at: '2026-10-02T15:00:00.000Z' },
  issuer: { name: 'INFRAMAQ S.A.C.', address: 'Lurín, Lima', logoUrl: 'https://x/logo.png', taxId: '20601234567' },
  figureUrl: 'https://inframaq.constroad.com/img/cubicar/volquete-concavo.png',
  measures: [
    { code: 'A1', label: 'Ancho', meters: 2.4 },
    { code: 'A4', label: 'Alto cóncavo', meters: 0.6, formula: 'A3 − A5' },
  ],
  figure: { totalWidth: '2.4', totalLength: '5.2', totalHeight: '1.5', squareHeight: '0.9', centralConcaveWidth: '1.2', concaveHight: '0.6', leftConcaveWidth: '0.6', rightConcaveWidth: '0.6' },
  parts: [{ label: 'Parte recta', formula: 'A1 × A2 × A5 = 2.40 × 5.20 × 0.90', m3: 11.23 }],
  m3: 17.92,
  dispatch: [{ m3: 15, loadCm: 127, fromTopCm: 23 }],
};

describe('CubicageCertificateSheet', () => {
  it('heads with the legal name, the RUC and the number', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={VIEW} screen />);

    // Assert
    expect(screen.getByText('INFRAMAQ S.A.C.')).toBeTruthy();
    expect(screen.getByText('RUC 20601234567 · Lurín, Lima')).toBeTruthy();
    expect(screen.getByText('N.º CUB-2026-0031')).toBeTruthy();
    expect(screen.getByText('13/11/2026')).toBeTruthy();
  });

  it('prints the unit, the certified volume and who signs', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={VIEW} />);

    // Assert
    expect(screen.getByText('ABC-123')).toBeTruthy();
    expect(screen.getAllByText('17.92 m³').length).toBe(2);
    expect(screen.getByText('Volumen certificado')).toBeTruthy();
    expect(screen.getAllByText('Darío Quispe').length).toBeGreaterThan(0);
  });

  it('draws the hopper with its own dimensions', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={VIEW} />);

    // Assert
    expect(screen.getByRole('img', { name: 'Tolva cóncavo de ABC-123 con sus cotas' })).toBeTruthy();
    expect(screen.getByText('A1 = 2.40 m')).toBeTruthy();
    expect(screen.getByText('A2 = 5.20 m')).toBeTruthy();
    expect(screen.getByText('A4 = 0.60 m')).toBeTruthy();
  });

  it('says what it replaces, and marks the deduced measures', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={VIEW} />);

    // Assert
    expect(screen.getByText('15.40 m³ · 02/10/2026')).toBeTruthy();
    expect(screen.getByText('A3 − A5')).toBeTruthy();
    expect(screen.getByText('Reemplaza al cubicaje anterior de la unidad ABC-123')).toBeTruthy();
  });

  it('gives the dispatch heights in centimeters', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={VIEW} />);

    // Assert
    expect(screen.getByText('127 cm')).toBeTruthy();
    expect(screen.getByText('23 cm')).toBeTruthy();
  });

  it('a first cubicage says so, and a tiny truck has no dispatch table', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={{ ...VIEW, previous: undefined, dispatch: [], issuer: { name: 'X', logoUrl: '', address: '' } }} />);

    // Assert
    expect(screen.getByText('Primer cubicaje')).toBeTruthy();
    expect(screen.queryByText('Tabla de alturas de despacho')).toBeNull();
  });

  it('takes the accent from the issuer brand, and keeps the ink without one', () => {
    // Arrange / Act
    const { container, rerender } = render(<CubicageCertificateSheet view={{ ...VIEW, issuer: { ...VIEW.issuer, accent: '#0f766e' } }} />);
    const branded = (container.firstChild as HTMLElement).getAttribute('style');
    rerender(<CubicageCertificateSheet view={VIEW} />);

    // Assert
    expect(branded).toContain('--cert-accent: #0f766e');
    expect((container.firstChild as HTMLElement).getAttribute('style')).toBeNull();
  });

  it('names the company that measured the truck when it is not the issuer', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={{ ...VIEW, issuer: { ...VIEW.issuer, name: 'CONSTROAD' }, measuredBy: { companyName: 'INFRAMAQ S.A.C.' } }} />);

    // Assert
    expect(screen.getByText('Medido por INFRAMAQ S.A.C. el 13/11/2026')).toBeTruthy();
  });

  it('says nothing about who measured when the issuer did', () => {
    // Arrange / Act
    render(<CubicageCertificateSheet view={VIEW} />);

    // Assert
    expect(screen.queryByText(/Medido por/)).toBeNull();
  });

  it('prints on A4 with margins only when paged', () => {
    // Arrange / Act / Assert
    expect(CERTIFICATE_CSS(true)).toContain('margin: 12mm');
    expect(CERTIFICATE_CSS(false)).toContain('margin: 0');
  });

  it('leaves out the number and the date a truck does not have, instead of printing them bare', () => {
    // Arrange
    const { number: _number, measuredAt: _measuredAt, ...bare } = VIEW;

    // Act
    render(<CubicageCertificateSheet view={{ ...bare, measuredBy: { companyName: 'INFRAMAQ S.A.C.' } }} />);

    // Assert
    expect(screen.queryByText(/N\.º/)).toBeNull();
    expect(screen.queryByText(/Cubicado:/)).toBeNull();
    expect(screen.getByText('Página 1 / 1')).toBeTruthy();
    expect(screen.getByText('Medido por INFRAMAQ S.A.C.')).toBeTruthy();
  });
});
