import { lengthOfLine } from './streetGeometry';
import { pickStreet, pickedLine, pickedRange, tapOnPick, PICK_SWITCH_M } from './streetPick';

/**
 * José 07/11, about the street editor: «no quiero que copies, audítalo y mejóralo» for a field
 * engineer. Portal took the whole street from the basemap and the trim was typing «Hasta»; here the
 * engineer taps the street, then taps where the work starts and ends on it.
 */
const M_PER_DEG_LNG = 111_195 * Math.cos((12 * Math.PI) / 180);
const east = (meters: number) => ({ lat: -12, lng: -77 + meters / M_PER_DEG_LNG });
const axis = [east(0), east(200), east(500)];
const street = { name: 'Jr. Los Pinos', line: axis, extraChains: 0 };

describe('picking a street and the stretch of work on it', () => {
  it('starts with the whole street and its name, waiting for the start', () => {
    const pick = pickStreet(street);
    expect(pick).toMatchObject({ name: 'Jr. Los Pinos', fromM: null, toM: null });
    expect(Math.round(lengthOfLine(pickedLine(pick!)))).toBe(500);
    expect(pickedRange(pick!)).toEqual({ fromM: 0, toM: 500, step: 'start' });
  });

  it('the first tap on it is the start, the second the end, in any order', () => {
    const started = tapOnPick(pickStreet(street)!, { lat: -12.00005, lng: east(320).lng });
    expect(started.kind).toBe('marked');
    const pick = started.kind === 'marked' ? started.pick : null;
    expect(pickedRange(pick!)).toMatchObject({ fromM: 320, step: 'end' });
    const ended = tapOnPick(pick!, east(80));
    const done = ended.kind === 'marked' ? ended.pick : null;
    expect(pickedRange(done!)).toEqual({ fromM: 80, toM: 320, step: 'done' });
    expect(Math.round(lengthOfLine(pickedLine(done!)))).toBe(240);
  });

  it('a third tap starts the stretch again from there', () => {
    let pick = pickStreet(street)!;
    for (const meters of [100, 300, 450]) {
      const next = tapOnPick(pick, east(meters));
      if (next.kind === 'marked') pick = next.pick;
    }
    expect(pickedRange(pick)).toMatchObject({ fromM: 450, step: 'end' });
  });

  it('a tap away from the street asks for another street instead of moving the stretch', () => {
    const far = { lat: -12 + (PICK_SWITCH_M + 5) / 111_195, lng: east(100).lng };
    expect(tapOnPick(pickStreet(street)!, far)).toEqual({ kind: 'other_street' });
  });

  it('a street that is not a line is nothing to pick', () => {
    expect(pickStreet({ name: 'x', line: [east(0)], extraChains: 0 })).toBeNull();
  });
});
