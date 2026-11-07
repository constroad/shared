import { scopeMetrics, streetTotals, effectiveWidthM } from './scopeMetrics';

/**
 * The scope's metrado. The rule that matters: what is missing is `null`, not zero.
 *
 * Measured in production on 29/08/2026: 6 of 24 streets had a width. If the
 * calculation returned 0 for the other 18, the drawing would say the work is a
 * quarter of its real size, and the number would come out printed and signed.
 */

describe('scopeMetrics', () => {
  it('largo × ancho = m², × espesor = m³', () => {
    const m = scopeMetrics({ fromM: 0, toM: 120, widthM: 6, thicknessM: 0.05 });

    expect(m).toEqual({
      lengthM: 120,
      areaM2: 720,
      thicknessM: 0.05,
      volumeM3: 36,
      missing: null,
    });
  });

  it('SIN ANCHO el m² es null, nunca 0: un cero se suma a los totales', () => {
    const m = scopeMetrics({ fromM: 0, toM: 120, widthM: null, thicknessM: 0.05 });

    expect(m.areaM2).toBeNull();
    expect(m.volumeM3).toBeNull();
    expect(m.missing).toBe('ancho');
  });

  it('con ancho pero sin espesor hay m² y el que falta es el m³', () => {
    const m = scopeMetrics({ fromM: 0, toM: 120, widthM: 6 });

    expect(m.areaM2).toBe(720);
    expect(m.volumeM3).toBeNull();
    expect(m.missing).toBe('espesor');
  });

  it('el espesor del TRAMO pisa al de la partida', () => {
    const m = scopeMetrics({
      fromM: 0,
      toM: 100,
      widthM: 6,
      thicknessM: 0.08,
      partidaThicknessM: 0.05,
    });

    expect(m.thicknessM).toBe(0.08);
    expect(m.volumeM3).toBe(48);
  });

  it('sin espesor propio hereda el de la partida', () => {
    const m = scopeMetrics({ fromM: 0, toM: 100, widthM: 6, partidaThicknessM: 0.05 });

    expect(m.thicknessM).toBe(0.05);
    expect(m.volumeM3).toBe(30);
  });

  it('redondea a 2 decimales: el plano se firma', () => {
    const m = scopeMetrics({ fromM: 0, toM: 12.5, widthM: 6.15, thicknessM: 0.075 });

    // 76.875 → 76.88, and the m³ is computed on the ALREADY rounded m² (5.7656 →
    // 5.77): that way the drawing's table adds up when someone multiplies by hand.
    expect(m.areaM2).toBe(76.88);
    expect(m.volumeM3).toBe(5.77);
  });

  it('un tramo invertido no da metros negativos', () => {
    expect(scopeMetrics({ fromM: 120, toM: 0, widthM: 6 }).lengthM).toBe(0);
  });

  it('un ancho de 0 se trata como «no cargado», no como una calle de 0 m', () => {
    // The input sends 0 when the field is cleared: that means "unknown", not "measures zero".
    expect(scopeMetrics({ fromM: 0, toM: 100, widthM: 0 }).missing).toBe('ancho');
  });
});

describe('streetTotals', () => {
  const loadedWidth = { widthM: 6 };

  it('suma los tramos de la calle', () => {
    const totals = streetTotals({
      ...loadedWidth,
      scopes: [
        { fromM: 0, toM: 120, thicknessM: 0.05 },
        { fromM: 120, toM: 212, thicknessM: 0.05 },
      ],
    });

    expect(totals.areaM2).toBe(1272);
    expect(totals.volumeM3).toBe(63.6);
    expect(totals.incompleteScopes).toBe(0);
  });

  it('con un tramo a medias el total sigue sumando el resto, PERO lo avisa', () => {
    // Hiding the total until everything is loaded would force completing the
    // whole street to check whether the width you typed was right.
    const totals = streetTotals({
      ...loadedWidth,
      scopes: [
        { fromM: 0, toM: 120, thicknessM: 0.05 },
        { fromM: 120, toM: 212 },
      ],
    });

    expect(totals.areaM2).toBe(1272);
    expect(totals.volumeM3).toBe(36);
    expect(totals.incompleteScopes).toBe(1);
  });

  it('sin ancho en la calle no hay total: null, no cero', () => {
    const totals = streetTotals({
      scopes: [{ fromM: 0, toM: 120 }, { fromM: 120, toM: 212 }],
    });

    expect(totals.areaM2).toBeNull();
    expect(totals.volumeM3).toBeNull();
    expect(totals.incompleteScopes).toBe(2);
  });

  it('el espesor puede venir de la partida del tramo', () => {
    const totals = streetTotals({
      ...loadedWidth,
      scopes: [{ fromM: 0, toM: 100, partidaIds: ['p1'] }],
      thicknessOfPartida: (id) => (id === 'p1' ? 0.05 : undefined),
    });

    expect(totals.volumeM3).toBe(30);
  });

  it('una calle sin tramos no rompe', () => {
    expect(streetTotals({ scopes: [], widthM: 6 })).toEqual({
      areaM2: null,
      volumeM3: null,
      incompleteScopes: 0,
    });
  });
});

/**
 * Width per SCOPE (C5, 30/08/2026). It comes from José's case: a street that is
 * 6 m at the start and 5 m halfway. Until then there was one width per street.
 */
describe('effectiveWidthM — el tramo manda, la calle hereda', () => {
  it('sin ancho propio, hereda el de la calle', () => {
    expect(effectiveWidthM({}, { widthM: 6 })).toBe(6);
  });

  it('con ancho propio, pisa al de la calle', () => {
    expect(effectiveWidthM({ widthM: 5 }, { widthM: 6 })).toBe(5);
  });

  it('un 0 en el tramo NO es un ancho: vuelve a heredar', () => {
    // That is how the UI clears the override. A real 0 would measure 0 m².
    expect(effectiveWidthM({ widthM: 0 }, { widthM: 6 })).toBe(6);
  });

  it('sin ancho en ningún lado devuelve null, nunca cero', () => {
    expect(effectiveWidthM({}, {})).toBeNull();
    expect(effectiveWidthM({ widthM: 0 }, { widthM: 0 })).toBeNull();
  });

  it('el tramo puede tener ancho aunque la calle no', () => {
    expect(effectiveWidthM({ widthM: 5 }, {})).toBe(5);
  });

  it('descarta basura en vez de propagar NaN al metrado', () => {
    expect(effectiveWidthM({ widthM: Number.NaN }, { widthM: 6 })).toBe(6);
    expect(effectiveWidthM({ widthM: -3 }, { widthM: 6 })).toBe(6);
  });
});

describe('streetTotals con anchos por tramo', () => {
  it('cada tramo se mide con SU ancho', () => {
    // 100 m × 6 = 600; 100 m × 5 = 500. With a single width they would give 1200.
    const totals = streetTotals({
      // With thickness so the only thing that can be missing is the width.
      scopes: [
        { fromM: 0, toM: 100, thicknessM: 0.05 },
        { fromM: 100, toM: 200, widthM: 5, thicknessM: 0.05 },
      ],
      widthM: 6,
    });
    expect(totals.areaM2).toBe(1100);
    expect(totals.incompleteScopes).toBe(0);
  });

  it('un tramo con ancho propio se mide aunque la calle no tenga', () => {
    const totals = streetTotals({
      scopes: [
        { fromM: 0, toM: 100, thicknessM: 0.05 },
        { fromM: 100, toM: 200, widthM: 5, thicknessM: 0.05 },
      ],
    });
    expect(totals.areaM2).toBe(500);
    // The other one is still unmeasured, and that is reported.
    expect(totals.incompleteScopes).toBe(1);
  });
});
