import { materialOptionLabels, uniqueOptionLabels } from './optionLabels';
import { providerRoleFilter } from './providerRole';

describe('option labels', () => {
  it('adds the unit only where the name repeats', () => {
    expect(materialOptionLabels([{ name: 'Filler mineral', unit: 'kg' }, { name: 'Arena fina', unit: 'M3' }, { name: 'Filler mineral', unit: 'TM' }])).toEqual(['Filler mineral (kg)', 'Arena fina', 'Filler mineral (TM)']);
  });

  it('leaves names alone when none repeats, and an empty list stays empty', () => {
    expect(materialOptionLabels([{ name: 'Arena fina', unit: 'M3' }, { name: 'Confitillo', unit: 'M3' }])).toEqual(['Arena fina', 'Confitillo']);
    expect(materialOptionLabels([])).toEqual([]);
  });

  it('a repeated name with no hint is left as it is: no hint is invented', () => {
    expect(uniqueOptionLabels([{ name: 'Ana Pérez' }, { name: 'Ana Pérez', hint: '  ' }])).toEqual(['Ana Pérez', 'Ana Pérez']);
    expect(uniqueOptionLabels([{ name: 'Ana', hint: ' Planta ' }, { name: 'Ana', hint: 'Lima' }])).toEqual(['Ana (Planta)', 'Ana (Lima)']);
  });
});

describe('providerRoleFilter', () => {
  it('a carrier moves material or is accepted at the gate; a quarry sells material', () => {
    expect(providerRoleFilter('transport')).toEqual({ $or: [{ transportsMaterials: true }, { acceptsInputReception: true }, { acceptsAggregateReception: true }] });
    expect(providerRoleFilter('seller')).toEqual({ $or: [{ sellsMaterials: true }] });
  });
});
