import {
  buildInputArrivalISOString,
  formatInputArrivalDate,
  formatInputArrivalDateTime,
  parseInputArrivalDate,
} from "./inputArrivalDate";

describe('inputArrivalDate', () => {
  it('interpreta fechas heredadas como día/mes/año', () => {
    expect(
      parseInputArrivalDate('1/7/2026, 12:34:56 p. m.')?.toISOString()
    ).toBe('2026-07-01T17:34:56.000Z');
  });

  it('conserva enero cuando corresponde', () => {
    expect(parseInputArrivalDate('7/1/2026, 8:05:00 a. m.')?.toISOString()).toBe(
      '2026-01-07T13:05:00.000Z'
    );
  });

  it('acepta valores ISO nuevos', () => {
    expect(
      parseInputArrivalDate('2026-07-01T15:30:00.000Z')?.toISOString()
    ).toBe('2026-07-01T15:30:00.000Z');
  });

  it('acepta registros antiguos mes/día cuando son inequívocos', () => {
    expect(parseInputArrivalDate('5/14/2026, 10:30:00 AM')?.toISOString()).toBe(
      '2026-05-14T15:30:00.000Z'
    );
  });

  it('preserva fechas ISO sin desplazar el calendario peruano', () => {
    expect(formatInputArrivalDate('2026-07-01')).toContain('01 jul');
  });

  it('usa createdAt cuando arriveDate es inválido', () => {
    expect(
      formatInputArrivalDate('inválida', '2026-07-01T15:30:00.000Z')
    ).toContain('01 jul');
  });

  it('formatea la fecha y hora de registro en zona horaria de Perú', () => {
    expect(
      formatInputArrivalDateTime('2026-07-01T17:34:56.000Z')
    ).toMatch(/01 jul\.? 2026, 12:34 p\.\s*m\./i);
  });

  it('incluye la hora de createdAt cuando arriveDate es inválido', () => {
    expect(
      formatInputArrivalDateTime('inválida', '2026-07-01T15:30:00.000Z')
    ).toMatch(/01 jul\.? 2026, 10:30 a\.\s*m\./i);
  });

  it('genera ISO usando fecha peruana seleccionada', () => {
    expect(
      buildInputArrivalISOString(
        '2026-07-01',
        new Date('2026-07-01T17:34:56.000Z')
      )
    ).toBe('2026-07-01T17:34:56.000Z');
  });

  it('rechaza fechas calendarias inexistentes', () => {
    expect(parseInputArrivalDate('31/2/2026, 10:00:00 a. m.')).toBeNull();
  });
});
