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
  issuer: { name: 'INFRAMAQ S.A.C.', address: 'Lurín, Lima', logoUrl: 'https://x/logo.png' },
  figureUrl: 'https://inframaq.constroad.com/img/cubicar/volquete-concavo.png',
  measures: [
    { code: 'A1', label: 'Ancho', meters: 2.4 },
    { code: 'A4', label: 'Alto cóncavo', meters: 0.6, formula: 'A3 − A5' },
  ],
  parts: [{ label: 'Parte recta', formula: 'A1 × A2 × A5 = 2.40 × 5.20 × 0.90', m3: 11.23 }],
  m3: 17.92,
  dispatch: [{ m3: 15, loadCm: 127, fromTopCm: 23 }],
};

describe('CubicageCertificateSheet', () => {
  it('prints the number, the unit, the volume and who signs', () => {
    render(<CubicageCertificateSheet view={VIEW} screen />);

    expect(screen.getByText('N.° CUB-2026-0031')).toBeTruthy();
    expect(screen.getByText('ABC-123')).toBeTruthy();
    expect(screen.getByText('17.92 m³')).toBeTruthy();
    expect(screen.getAllByText('Darío Quispe').length).toBeGreaterThan(0);
    expect(screen.getByText('Cubicado el 13/11/2026 · 09:42')).toBeTruthy();
  });

  it('says what it replaces, and marks the deduced measures', () => {
    render(<CubicageCertificateSheet view={VIEW} />);

    expect(screen.getByText('15.40 m³ el 02/10/2026')).toBeTruthy();
    expect(screen.getByText('A3 − A5')).toBeTruthy();
    expect(screen.getByAltText('Sección de tolva cóncavo con sus cotas').getAttribute('src')).toBe('https://inframaq.constroad.com/img/cubicar/volquete-concavo.png');
    expect(screen.getByText('Este certificado reemplaza al cubicaje anterior de la unidad ABC-123')).toBeTruthy();
  });

  it('gives the dispatch heights in centimeters', () => {
    render(<CubicageCertificateSheet view={VIEW} />);

    expect(screen.getByText('127 cm')).toBeTruthy();
    expect(screen.getByText('23 cm')).toBeTruthy();
  });

  it('a first cubicage says so, and a tiny truck has no dispatch table', () => {
    render(<CubicageCertificateSheet view={{ ...VIEW, previous: undefined, dispatch: [], issuer: { ...VIEW.issuer, logoUrl: '', address: '' } }} />);

    expect(screen.getByText('Primer cubicaje')).toBeTruthy();
    expect(screen.queryByText('Tabla de alturas de despacho')).toBeNull();
  });

  it('prints on A4 with margins only when paged', () => {
    expect(CERTIFICATE_CSS(true)).toContain('margin: 14mm');
    expect(CERTIFICATE_CSS(false)).toContain('margin: 0');
  });

  it('names the company that measured the truck when it is not the issuer', () => {
    render(<CubicageCertificateSheet view={{ ...VIEW, issuer: { ...VIEW.issuer, name: 'CONSTROAD' }, measuredBy: { companyName: 'INFRAMAQ S.A.C.' } }} />);

    expect(screen.getByText('Medido por INFRAMAQ S.A.C. el 13/11/2026')).toBeTruthy();
  });

  it('says nothing about who measured when the issuer did', () => {
    render(<CubicageCertificateSheet view={VIEW} />);

    expect(screen.queryByText(/Medido por/)).toBeNull();
  });
});
