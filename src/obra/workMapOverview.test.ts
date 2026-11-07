import { workMapOverview, narrowToStage } from './workMapOverview';

const workStreets = {
  streets: [
    { _id: 's1', name: 'Av. El Sol', geometry: [], lengthM: 1000, widthM: 7 },
    { _id: 's2', name: 'Jr. Lima', geometry: [], lengthM: 200, widthM: 6 },
  ],
  scopes: [
    { _id: 'a', streetId: 's1', fromM: 0, toM: 1000, partidaIds: [], tagIds: ['base', 'carpeta'], stageId: 'e1' },
    { _id: 'b', streetId: 's2', fromM: 0, toM: 200, partidaIds: [], tagIds: ['carpeta'], stageId: 'e2' },
  ],
  progress: [
    { streetId: 's1', partidaId: '', tagId: 'base', fromM: 0, toM: 1000, date: '2026-09-01' },
    { streetId: 's1', partidaId: '', tagId: 'carpeta', fromM: 0, toM: 400, date: '2026-09-05' },
    { streetId: 's2', partidaId: '', tagId: 'carpeta', fromM: 0, toM: 200, date: '2026-09-08' },
  ],
  tags: [
    { _id: 'base', name: 'Base granular', color: '#111111', order: 1 },
    { _id: 'carpeta', name: 'Carpeta asfáltica', color: '#222222', order: 2 },
  ],
  stages: [
    { _id: 'e1', name: 'Etapa 1', order: 1 },
    { _id: 'e2', name: 'Etapa 2', order: 2 },
  ],
};

describe('workMapOverview', () => {
  it('counts the streets whose every layer reached the end', () => {
    // Act
    const overview = workMapOverview({ workStreets, partidas: [] });

    // Assert
    expect(overview.streetsDone).toBe(1);
    expect(overview.streetsTotal).toBe(2);
  });

  it('weighs the progress by the metres of each layer', () => {
    expect(workMapOverview({ workStreets, partidas: [] }).progressPct).toBe(72.7);
  });

  it('reads the asphalt figure from the layer that names it', () => {
    const overview = workMapOverview({ workStreets, partidas: [] });

    expect(overview.lead).toEqual({ label: 'Carpeta asfáltica', value: '4,000', unit: 'm²' });
  });

  it('tells each street where every layer stopped', () => {
    // Act
    const [elSol, lima] = workMapOverview({ workStreets, partidas: [] }).streets;

    // Assert
    expect(elSol.status).toBe('Base granular completa · Carpeta asfáltica hasta Km 0+400');
    expect(elSol.done).toBe(false);
    expect(lima).toMatchObject({ status: 'Terminada', done: true });
  });

  it('rewinds everything to the chosen day', () => {
    // Act
    const overview = workMapOverview({ workStreets, partidas: [], upToDate: '2026-09-01' });

    // Assert
    expect(overview.streetsDone).toBe(0);
    expect(overview.lastDay).toEqual({ date: '2026-09-01', number: 1 });
    expect(overview.streets[1].status).toBe('Sin avance a esta fecha');
  });

  it('points to the furthest active front of a street still in progress', () => {
    expect(workMapOverview({ workStreets, partidas: [] }).activeFront).toEqual({ street: 'Av. El Sol', meters: 1000 });
  });

  it('has no last day on a work without dated progress', () => {
    const overview = workMapOverview({ workStreets: { ...workStreets, progress: [] }, partidas: [] });

    expect(overview.lastDay).toBeNull();
    expect(overview.progressPct).toBe(0);
    expect(overview.activeFront).toBeNull();
  });
});

describe('narrowToStage', () => {
  it('keeps only the streets, stretches and progress of the stage', () => {
    // Act
    const narrowed = narrowToStage(workStreets, 'e2');

    // Assert
    expect(narrowed.streets.map((street) => street._id)).toEqual(['s2']);
    expect(narrowed.scopes).toHaveLength(1);
    expect(narrowed.progress).toHaveLength(1);
  });

  it('leaves the whole work untouched without a stage', () => {
    expect(narrowToStage(workStreets, '')).toBe(workStreets);
  });
});
