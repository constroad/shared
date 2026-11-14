import {
  applyZonePhotoTotals,
  groupPhotosByZone,
  recomputeZoneTotals,
  zoneMeasuredTotal,
  type IaaMeasuredPhoto,
  type IaaZoneRow,
} from './iaaZones';

const rows = (): IaaZoneRow[] => [
  { id: 'z1', item: '1', ubicacion: 'Km 3', descripcion: '', area: '', volumen: '', observaciones: '' },
  { id: 'z2', item: '2', ubicacion: 'Km 5', descripcion: '', area: '50.00', volumen: '25.000', observaciones: '' },
];

describe('recomputeZoneTotals', () => {
  it('zona CON fotos → suma medida (area 2 dec, volumen 3 dec)', () => {
    const photos: IaaMeasuredPhoto[] = [
      { category: 'z1', areaM2: 12.4, volumeM3: 1.86 },
      { category: 'z1', areaM2: 8.1, volumeM3: 1.22 },
    ];
    const result = recomputeZoneTotals(rows(), photos);
    expect(result[0].area).toBe('20.50');
    expect(result[0].volumen).toBe('3.080');
  });

  it('zona SIN fotos que NUNCA tuvo → conserva su valor manual', () => {
    const photos: IaaMeasuredPhoto[] = [{ category: 'z1', areaM2: 5, volumeM3: 0.5 }];
    const result = recomputeZoneTotals(rows(), photos);
    expect(result[1].area).toBe('50.00');
    expect(result[1].volumen).toBe('25.000');
  });

  it('zona que PERDIÓ su última foto (estaba en prev, ya no) → se resetea a vacío', () => {
    const prevPhotos: IaaMeasuredPhoto[] = [{ category: 'z2', areaM2: 30, volumeM3: 3 }];
    const nextPhotos: IaaMeasuredPhoto[] = []; // removed/reassigned
    const seeded = rows();
    seeded[1] = { ...seeded[1], area: '30.00', volumen: '3.000' }; // total derivado previo
    const result = recomputeZoneTotals(seeded, nextPhotos, prevPhotos);
    expect(result[1].area).toBe(''); // orphan → reset, the stale 30 does not stay
    expect(result[1].volumen).toBe('');
  });

  // José 2026-07-17: on /public (mobile) reassigning a photo's "place" did not
  // re-sum the zones → the new zone stayed at 0.00. On REASSIGN, the previous
  // zone must SUBTRACT (lose that contribution) and the new one ADD the m²/m³.
  it('reasignar la zona de una foto: resta a la anterior y suma a la nueva', () => {
    const prevPhotos: IaaMeasuredPhoto[] = [{ category: 'z2', areaM2: 40, volumeM3: 4 }];
    const nextPhotos: IaaMeasuredPhoto[] = [{ category: 'z1', areaM2: 40, volumeM3: 4 }];
    const seeded = rows();
    seeded[1] = { ...seeded[1], area: '40.00', volumen: '4.000' }; // total previo de z2
    const result = recomputeZoneTotals(seeded, nextPhotos, prevPhotos);
    expect(result[0].area).toBe('40.00'); // z1 gana el aporte
    expect(result[0].volumen).toBe('4.000');
    expect(result[1].area).toBe(''); // z2 loses it (the stale 40 does not stay)
    expect(result[1].volumen).toBe('');
  });

  it('sin prevPhotos (server/PDF): conserva zonas sin foto, no las pone en 0', () => {
    const photos: IaaMeasuredPhoto[] = [{ category: 'z1', areaM2: 12, volumeM3: 1 }];
    const result = recomputeZoneTotals(rows(), photos);
    expect(result[0].area).toBe('12.00');
    expect(result[1].area).toBe('50.00');
  });
});

describe('groupPhotosByZone', () => {
  const options = [
    { value: 'g1', label: 'Grupo Uno' },
    { value: 'g2', label: 'Grupo Dos' },
  ];
  const entries: Array<{ photo: { category?: string }; index: number }> = [
    { photo: { category: 'g2' }, index: 0 },
    { photo: { category: 'g1' }, index: 1 },
    { photo: { category: 'x-viejo' }, index: 2 }, // orphan category
    { photo: {}, index: 3 }, // no category
  ];

  it('agrupa por categoría en el ORDEN de las opciones y omite grupos vacíos', () => {
    const groups = groupPhotosByZone(entries, options);
    expect(groups.map((group) => group.zoneLabel)).toEqual(['Grupo Uno', 'Grupo Dos', 'Sin zona']);
    // Keeps each photo's original index (to edit/delete the right one).
    expect(groups[0].entries.map((entry) => entry.index)).toEqual([1]);
    expect(groups[2].entries.map((entry) => entry.index)).toEqual([2, 3]);
  });

  it('el label del grupo huérfano es configurable (CTL-IMP = "Sin tramo")', () => {
    const groups = groupPhotosByZone(entries, options, 'Sin tramo');
    expect(groups.at(-1)?.zoneLabel).toBe('Sin tramo');
  });
});

/**
 * The total written BY HAND (17/10/2026).
 *
 * Totals were derived from the photos and the field was read-only. In CHANCAY
 * 4 of 20 measurements could not be recovered (the engineer drew the figure
 * without measuring the sides, so the area comes from the pixel scale and is
 * not stored) and there was no way to complete them without going back to the
 * field. Now the row can be marked `manual` and stops being recomputed, with an
 * on-screen notice that it no longer matches its photos.
 */
describe('zonas con total escrito a mano', () => {
  const photos = [
    { category: 'z1', areaM2: 10, volumeM3: 0.4 },
    { category: 'z1', areaM2: 5, volumeM3: 0.2 },
  ];
  const zonaManual = {
    id: 'z1',
    item: '1',
    ubicacion: 'Calle cascadas',
    descripcion: 'Bacheo',
    area: '83.96',
    volumen: '3.503',
    observaciones: '',
    manual: true,
  };

  it('una fila manual conserva lo tecleado aunque la zona tenga fotos medidas', () => {
    const [row] = recomputeZoneTotals([zonaManual], photos);
    expect(row.area).toBe('83.96');
    expect(row.volumen).toBe('3.503');
  });

  it('sin la marca, la misma fila vuelve a derivarse de las fotos', () => {
    const [row] = recomputeZoneTotals([{ ...zonaManual, manual: false }], photos);
    expect(row.area).toBe('15.00');
    expect(row.volumen).toBe('0.600');
  });

  it('applyZonePhotoTotals tampoco pisa la fila manual', () => {
    const [row] = applyZonePhotoTotals([zonaManual], photos);
    expect(row.area).toBe('83.96');
  });

  it('zoneMeasuredTotal dice qué suman las fotos, para poder avisar la diferencia', () => {
    expect(zoneMeasuredTotal('z1', photos)).toEqual({ area: 15, volume: 0.6000000000000001 });
    expect(zoneMeasuredTotal('z-sin-fotos', photos)).toBeNull();
  });
});
