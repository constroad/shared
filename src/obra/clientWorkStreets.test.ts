import { toClientWorkStreets } from './clientWorkStreets';

/**
 * What the CLIENT may see of the map.
 *
 * The payload is built from a whitelist, not by omission: if someone adds a
 * cost field to the model tomorrow, it does not leak by itself. These tests are the lock.
 */

const street = (over: Record<string, unknown> = {}) => ({
  _id: 'street-1',
  companyId: 'test',
  name: 'Jr. Lima',
  geometry: [{ lat: -12, lng: -76.9 }],
  lengthM: 482,
  widthM: 6,
  source: 'basemap',
  matchConfidence: 0.85,
  createdBy: 'user-interno',
  ...over,
});

const progress = (over: Record<string, unknown> = {}) => ({
  _id: 'progress-1',
  companyId: 'test',
  streetId: 'street-1',
  partidaId: 'p1',
  fromM: 0,
  toM: 200,
  quantity: 1200,
  status: 'approved',
  date: '2026-08-01',
  source: 'admin',
  ...over,
});

describe('toClientWorkStreets', () => {
  it('devuelve la calle con lo necesario para dibujarla', () => {
    const result = toClientWorkStreets({ streets: [street()], scopes: [], progress: [] });

    expect(result.streets[0]).toEqual({
      _id: 'street-1',
      name: 'Jr. Lima',
      geometry: [{ lat: -12, lng: -76.9 }],
      lengthM: 482,
      // Joins in F5: without width there is no m², and the client report shows
      // «área asfaltada X de Y». It is contracted geometry, not a cost.
      widthM: 6,
    });
  });

  it('sin ancho cargado no inventa uno', () => {
    const result = toClientWorkStreets({
      streets: [street({ widthM: undefined })],
      scopes: [],
      progress: [],
    });

    expect(result.streets[0].widthM).toBeUndefined();
  });

  it('NO filtra quién cargó la calle ni el detalle interno', () => {
    const result = toClientWorkStreets({ streets: [street()], scopes: [], progress: [] });
    const keys = Object.keys(result.streets[0]);

    expect(keys).not.toContain('createdBy');
    expect(keys).not.toContain('companyId');
    expect(keys).not.toContain('source');
    expect(keys).not.toContain('matchConfidence');
  });

  it('del avance salen las medidas y la fecha, no el metrado', () => {
    // The metrado is the number that gets invoiced: the map does not need it to
    // paint, and exposing it opens the door to deducing unit prices.
    const result = toClientWorkStreets({ streets: [], scopes: [], progress: [progress()] });

    expect(result.progress[0]).toEqual({
      streetId: 'street-1',
      partidaId: 'p1',
      fromM: 0,
      toM: 200,
      date: '2026-08-01',
      rework: undefined,
    });
    expect(Object.keys(result.progress[0])).not.toContain('quantity');
  });

  it('lo PENDIENTE no llega al cliente', () => {
    // It is internal conversation until the resident engineer approves it.
    const result = toClientWorkStreets({
      streets: [],
      scopes: [],
      progress: [progress({ status: 'pending' }), progress({ status: 'rejected' })],
    });

    expect(result.progress).toHaveLength(0);
  });

  it('descarta el avance sin tramo: no se puede pintar', () => {
    const result = toClientWorkStreets({
      streets: [],
      scopes: [],
      progress: [progress({ streetId: undefined })],
    });

    expect(result.progress).toHaveLength(0);
  });

  it('conserva el reproceso, que sí se ve como jornada', () => {
    const result = toClientWorkStreets({
      streets: [],
      scopes: [],
      progress: [progress({ rework: true })],
    });

    expect(result.progress[0].rework).toBe(true);
  });

  it('el alcance viaja con sus partidas Y con sus etiquetas', () => {
    const result = toClientWorkStreets({
      streets: [],
      scopes: [
        { _id: 's1', streetId: 'street-1', fromM: 0, toM: 482, partidaIds: ['p1'], tagIds: ['t1'] },
      ],
      progress: [],
    });

    expect(result.scopes[0]).toEqual({
      _id: 's1',
      streetId: 'street-1',
      fromM: 0,
      toM: 482,
      partidaIds: ['p1'],
      tagIds: ['t1'],
    });
  });

  it('el tramo sin etiqueta llega con la lista vacía, no indefinida', () => {
    const result = toClientWorkStreets({
      streets: [],
      scopes: [{ _id: 's1', streetId: 'street-1', fromM: 0, toM: 482, partidaIds: ['p1'] }],
      progress: [],
    });

    expect(result.scopes[0].tagIds).toEqual([]);
  });

  /**
   * The work axis is the tag (as-is 30/08/2026). Progress loaded by tag has NO
   * partida: without `tagId` the client saw it grey, as if nothing had been
   * done.
   */
  it('el avance por ETIQUETA llega con su tagId', () => {
    const result = toClientWorkStreets({
      streets: [],
      scopes: [],
      progress: [progress({ partidaId: undefined, tagId: 't1' })],
    });

    expect(result.progress[0].tagId).toBe('t1');
    expect(result.progress[0].partidaId).toBe('');
  });

  it('la etiqueta viaja con nombre, color y orden — nada más', () => {
    const result = toClientWorkStreets({
      streets: [],
      scopes: [],
      progress: [],
      tags: [
        {
          _id: 't1',
          companyId: 'test',
          serviceManagementId: 'obra-1',
          name: 'Imprimación',
          color: '#e11d48',
          order: 2,
          createdBy: 'user-interno',
        },
      ],
    });

    expect(result.tags).toEqual([
      { _id: 't1', name: 'Imprimación', color: '#e11d48', order: 2 },
    ]);
  });

  it('aguanta listas vacías', () => {
    expect(toClientWorkStreets({ streets: [], scopes: [], progress: [] })).toEqual({
      streets: [],
      scopes: [],
      progress: [],
      tags: [],
      stages: [],
    });
  });
});
