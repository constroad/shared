import { isCtlPisPhotoKind, isUnitOfReport, keepsEmptyPhoto, missingUnitPhotoKinds, printRowOf, requiresUnitEvidence, unitPhotosByDispatchOf } from './controlPistaPhotos';

describe('printRowOf', () => {
  it('an extra photo never takes a column: it prints after the units, and is never missing', () => {
    // José, 07/11/2026: optional photos under the four.
    const photos = [{ tipoFoto: 'adicional', mediaId: 'x' }, { tipoFoto: 'ingreso' }, { tipoFoto: 'temperatura' }, { tipoFoto: 'escantillon' }, { tipoFoto: 'vacia' }];

    const { row, rest } = printRowOf(photos);

    expect(row.map((photo) => photo.tipoFoto)).toEqual(['ingreso', 'temperatura', 'escantillon', 'vacia']);
    expect(rest).toEqual([{ tipoFoto: 'adicional', mediaId: 'x' }]);
    expect(missingUnitPhotoKinds([{ tipoFoto: 'adicional', stampContext: { location: { lat: -12, lon: -77 } } }])).toEqual(['ingreso', 'temperatura', 'vacia', 'escantillon']);
    expect(isCtlPisPhotoKind('adicional')).toBe(false);
  });

  it('puts the four kinds in the columns of the PDF whatever order they were taken', () => {
    const photos = [{ tipoFoto: 'vacia' }, { tipoFoto: 'escantillon' }, { tipoFoto: 'temperatura' }, { tipoFoto: 'ingreso' }];

    expect(printRowOf(photos).row.map((photo) => photo.tipoFoto)).toEqual(['ingreso', 'temperatura', 'escantillon', 'vacia']);
  });

  it('a photo taken again takes the column, and the old one goes after the units', () => {
    const old = { tipoFoto: 'ingreso', mediaId: 'old' };
    const fresh = { tipoFoto: 'ingreso', mediaId: 'new' };

    expect(printRowOf([old, fresh])).toEqual({ row: [fresh], rest: [old] });
  });

  it('a photo with no kind is never lost', () => {
    const untyped = { mediaId: 'x' } as { mediaId: string; tipoFoto?: string };

    expect(printRowOf([untyped]).rest).toEqual([untyped]);
  });
});

describe('unitPhotosByDispatchOf', () => {
  it('takes each gallery by its dispatch and nothing else of the report', () => {
    const schemaData = { unitPhotos_d1: { fotos: [{ mediaId: 'a' }] }, unitPhotos_d2: {}, panelFotografico: { fotos: [{ mediaId: 'b' }] } };

    expect(unitPhotosByDispatchOf(schemaData)).toEqual({ d1: [{ mediaId: 'a' }], d2: [] });
  });
});

describe('keepsEmptyPhoto', () => {
  it('the unit stays finished while another empty photo remains', () => {
    expect(keepsEmptyPhoto([{ tipoFoto: 'vacia', mediaId: 'a' }, { tipoFoto: 'vacia', mediaId: 'b' }], 'a')).toBe(true);
  });

  it('removing the only one reopens it, and other kinds do not count', () => {
    expect(keepsEmptyPhoto([{ tipoFoto: 'vacia', mediaId: 'a' }, { tipoFoto: 'ingreso', mediaId: 'b' }], 'a')).toBe(false);
  });
});

describe('the rest of the rules', () => {
  it('knows the four kinds and nothing else', () => {
    expect(isCtlPisPhotoKind('vacia')).toBe(true);
    expect(isCtlPisPhotoKind('selfie')).toBe(false);
    expect(isCtlPisPhotoKind(undefined)).toBe(false);
  });

  it('only a report born with the mark requires the evidence', () => {
    expect(requiresUnitEvidence({ control: { unitEvidence: true } })).toBe(true);
    expect(requiresUnitEvidence({ control: {} })).toBe(false);
    expect(requiresUnitEvidence(null)).toBe(false);
  });

  it('a unit named by the form must be a row of the report', () => {
    const schemaData = { controlPista: [{ _dispatchId: 'd1' }] };

    expect(isUnitOfReport(schemaData, 'd1')).toBe(true);
    expect(isUnitOfReport(schemaData, 'ajeno')).toBe(false);
    expect(isUnitOfReport(schemaData, '')).toBe(false);
    expect(isUnitOfReport({}, 'd1')).toBe(false);
  });

  it('a photo without position does not count as taken', () => {
    expect(missingUnitPhotoKinds([{ tipoFoto: 'ingreso', stampContext: { location: null } }])).toContain('ingreso');
  });
});
