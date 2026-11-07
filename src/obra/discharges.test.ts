import { dischargesOf } from './discharges';

const DISPATCH = { _id: 'd1', plate: 'ayf-892', quantity: 15, arrival: { at: '2026-11-06T13:00:00.000Z' }, fieldWork: { finishedAt: '2026-11-06T13:40:00.000Z' } };
const photo = (photoType: string, geo: string | undefined, extra: Record<string, unknown> = {}) => ({
  metadata: { dispatchId: 'd1', tipoFoto: photoType, ...(geo ? { geo } : {}), ...extra },
  createdAt: new Date('2026-11-06T15:00:00.000Z'),
});

describe('dischargesOf', () => {
  it('gives each unit its photos placed on the map, in the order they were taken', () => {
    // Arrange
    const photos = [
      photo('vacia', '-12.2,-76.9', { takenAt: '2026-11-06T13:40:00.000Z', precisionM: '6' }),
      photo('ingreso', '-12.1,-76.8', { takenAt: '2026-11-06T13:05:00.000Z', precisionM: '4.5' }),
    ];

    // Act
    const [discharge] = dischargesOf([DISPATCH], photos);

    // Assert
    expect(discharge).toEqual({
      dispatch_id: 'd1',
      plate: 'AYF-892',
      m3: 15,
      arrival_at: '2026-11-06T13:00:00.000Z',
      finished_at: '2026-11-06T13:40:00.000Z',
      points: [
        { kind: 'ingreso', lat: -12.1, lng: -76.8, precision_m: 4.5, at: '2026-11-06T13:05:00.000Z' },
        { kind: 'vacia', lat: -12.2, lng: -76.9, precision_m: 6, at: '2026-11-06T13:40:00.000Z' },
      ],
    });
  });

  it('dates an older photo by its upload when it has no taken time', () => {
    const [discharge] = dischargesOf([DISPATCH], [photo('ingreso', '-12.1,-76.8')]);

    expect(discharge.points[0].at).toBe('2026-11-06T15:00:00.000Z');
    expect(discharge.points[0]).not.toHaveProperty('precision_m');
  });

  it('leaves out photos without a usable position and units without any', () => {
    // Arrange
    const photos = [photo('ingreso', undefined), photo('vacia', 'sin,gps'), photo('temperatura', '200,10')];

    // Act + Assert
    expect(dischargesOf([DISPATCH], photos)).toEqual([]);
  });

  it('ignores photos of a dispatch that is not on the list', () => {
    const photos = [{ metadata: { dispatchId: 'otro', photoType: 'ingreso', geo: '-12.1,-76.8' }, createdAt: new Date() }];

    expect(dischargesOf([DISPATCH], photos)).toEqual([]);
  });

  it('keeps a unit without arrival or finish, with only what it has', () => {
    const [discharge] = dischargesOf([{ _id: 'd1', plate: 'X' }], [photo('ingreso', '-12.1,-76.8')]);

    expect(discharge).not.toHaveProperty('arrival_at');
    expect(discharge).not.toHaveProperty('finished_at');
    expect(discharge).not.toHaveProperty('m3');
  });
});
