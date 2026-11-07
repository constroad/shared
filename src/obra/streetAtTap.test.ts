import { streetAtTap, isRoadFeature } from './streetAtTap';

/**
 * Audit 07/11 (José: «audítalo y mejóralo»): `streetFromBasemapFeatures` takes the first named
 * feature as the tapped one. Asked with everything on screen, that is any street in view. Here
 * what is under the finger decides, and the rest only names it and continues it.
 */
const line = (name: string | undefined, coordinates: Array<[number, number]>, extra: Record<string, unknown> = { class: 'minor' }) => ({
  properties: { ...extra, ...(name === undefined ? {} : { name }) },
  geometry: { type: 'LineString', coordinates },
});
const LOS_PINOS_A = line(undefined, [[-77, -12], [-77, -12.001]]);
const LOS_PINOS_NAMED = line('Jr. Los Pinos', [[-77, -12], [-77, -12.001]]);
const LOS_PINOS_NEXT = line('Jr. Los Pinos', [[-77, -12.001], [-77, -12.002]]);
const LIMA = line('Av. Lima', [[-76.99, -12], [-76.99, -12.002]]);
const RIVER = line('Río Rímac', [[-77.00001, -12], [-77.00001, -12.002]], { class: 'river' });
const tap = { lat: -12.0005, lng: -77.00002 };

describe('streetAtTap', () => {
  it('names the street under the finger, not the first named one in view', () => {
    const street = streetAtTap({ underFinger: [LOS_PINOS_A], nearby: [LIMA, LOS_PINOS_NAMED, LOS_PINOS_NEXT], tap });
    expect(street?.name).toBe('Jr. Los Pinos');
  });

  it('continues it with the pieces of the same name past the crossing', () => {
    const street = streetAtTap({ underFinger: [LOS_PINOS_A], nearby: [LOS_PINOS_NAMED, LOS_PINOS_NEXT], tap });
    const ends = [street?.line[0]?.lat, street?.line.at(-1)?.lat].sort();
    expect(ends).toEqual([-12.002, -12]);
  });

  it('a street without a name in the map is still picked, alone, with an empty name to type', () => {
    const street = streetAtTap({ underFinger: [LOS_PINOS_A], nearby: [LIMA], tap });
    expect(street).toMatchObject({ name: '' });
    expect(street?.line).toHaveLength(2);
  });

  it('a river or a canal under the finger is not a street', () => {
    expect(isRoadFeature(RIVER)).toBe(false);
    expect(streetAtTap({ underFinger: [RIVER], nearby: [RIVER], tap })).toBeNull();
  });

  it('nothing under the finger is nothing', () => {
    expect(streetAtTap({ underFinger: [], nearby: [LIMA], tap })).toBeNull();
  });
});
