import {
  effectiveLengthM,
  isMeasured,
  rescaleScopes,
  toTraceRange,
} from './streetLength';

/**
 * The measured length.
 *
 * The case behind it (José, 29/08/2026): the base map trace says 212 m and the
 * block measures 198. That 7 % went straight into the drawing's m² and there
 * was no way to correct it, because the length was read-only.
 */

describe('effectiveLengthM', () => {
  it('sin medido manda el del trazo', () => {
    expect(effectiveLengthM({ lengthM: 212 })).toBe(212);
  });

  it('con medido manda el medido', () => {
    expect(effectiveLengthM({ lengthM: 212, measuredLengthM: 198 })).toBe(198);
  });

  it('un medido en 0 es «no cargado», no una calle de cero metros', () => {
    // The input sends 0 when the field is cleared.
    expect(effectiveLengthM({ lengthM: 212, measuredLengthM: 0 })).toBe(212);
  });

  it('isMeasured avisa a la UI que ese número no salió del trazo', () => {
    expect(isMeasured({ lengthM: 212, measuredLengthM: 198 })).toBe(true);
    expect(isMeasured({ lengthM: 212 })).toBe(false);
  });
});

describe('toTraceRange', () => {
  it('sin medido no toca nada', () => {
    expect(toTraceRange({ fromM: 0, toM: 120, effectiveM: 212, traceM: 212 })).toEqual({
      fromM: 0,
      toM: 120,
    });
  });

  it('un tramo que cubre la calle entera dibuja el trazo ENTERO', () => {
    // Without the conversion, «0 – 198» on a 212 trace would paint 93 % and the
    // last block would be left blank.
    expect(toTraceRange({ fromM: 0, toM: 198, effectiveM: 198, traceM: 212 })).toEqual({
      fromM: 0,
      toM: 212,
    });
  });

  it('un tramo del medio se convierte proporcionalmente', () => {
    const { fromM, toM } = toTraceRange({ fromM: 99, toM: 198, effectiveM: 198, traceM: 212 });

    expect(Math.round(fromM)).toBe(106);
    expect(Math.round(toM)).toBe(212);
  });

  it('con datos absurdos devuelve el rango tal cual en vez de romper', () => {
    expect(toTraceRange({ fromM: 0, toM: 50, effectiveM: 0, traceM: 212 })).toEqual({
      fromM: 0,
      toM: 50,
    });
  });
});

describe('rescaleScopes', () => {
  const scopes = [
    { _id: 'a', fromM: 0, toM: 106 },
    { _id: 'b', fromM: 106, toM: 212 },
  ];

  it('lleva los tramos al largo nuevo, proporcionalmente', () => {
    // Trimming would leave the last one short and the rest intact: all the error
    // in a single block. The one that covered half still covers half.
    const changes = rescaleScopes({ scopes, fromLengthM: 212, toLengthM: 198 });

    expect(changes).toEqual([
      { _id: 'a', fromM: 0, toM: 99 },
      { _id: 'b', fromM: 99, toM: 198 },
    ]);
  });

  it('el último tramo termina EXACTAMENTE en el largo nuevo', () => {
    const changes = rescaleScopes({ scopes, fromLengthM: 212, toLengthM: 198 });

    expect(changes[changes.length - 1].toM).toBe(198);
  });

  it('devuelve solo los que CAMBIAN: los demás serían escrituras al pedo', () => {
    const changes = rescaleScopes({
      scopes: [{ _id: 'a', fromM: 0, toM: 0 }, { _id: 'b', fromM: 0, toM: 212 }],
      fromLengthM: 212,
      toLengthM: 198,
    });

    expect(changes.map((c) => c._id)).toEqual(['b']);
  });

  it('mismo largo, nada que hacer', () => {
    expect(rescaleScopes({ scopes, fromLengthM: 212, toLengthM: 212 })).toEqual([]);
  });

  it('un largo en cero no borra la calle: no se reescala nada', () => {
    expect(rescaleScopes({ scopes, fromLengthM: 212, toLengthM: 0 })).toEqual([]);
    expect(rescaleScopes({ scopes, fromLengthM: 0, toLengthM: 198 })).toEqual([]);
  });

  it('sin tramos no rompe', () => {
    expect(rescaleScopes({ scopes: [], fromLengthM: 212, toLengthM: 198 })).toEqual([]);
  });
});
