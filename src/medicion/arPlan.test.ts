import { fitTapeScale, planArea, thicknessStats } from './arPlan';

/** A 4 × 2 m rectangle, as AR would hand it with no drift. */
const RECTANGLE = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 2 },
  { x: 0, y: 2 },
];

const scaled = (factor: number) => RECTANGLE.map((point) => ({ x: point.x * factor, y: point.y * factor }));

describe('planArea', () => {
  it('measures a polygon with the shoelace formula, whichever way it was walked', () => {
    // Act
    const clockwise = planArea([...RECTANGLE].reverse());
    const counter = planArea(RECTANGLE);

    // Assert
    expect(counter).toEqual({ ok: true, areaM2: 8, perimeterM: 12 });
    expect(clockwise).toEqual(counter);
  });

  it('drops a vertex tapped twice (closer than 1 cm) before measuring', () => {
    // Arrange
    const twice = [RECTANGLE[0], RECTANGLE[1], { x: 4.004, y: 0.003 }, RECTANGLE[2], RECTANGLE[3]];

    // Act
    const measured = planArea(twice);

    // Assert
    expect(measured.ok && measured.areaM2).toBeCloseTo(8, 2);
  });

  it('refuses fewer than three vertices', () => {
    expect(planArea(RECTANGLE.slice(0, 2))).toEqual({ ok: false, reason: 'pocos-vertices' });
  });

  it('refuses a contour that crosses itself (a bow tie has no area)', () => {
    // Arrange
    const bowTie = [RECTANGLE[0], RECTANGLE[2], RECTANGLE[1], RECTANGLE[3]];

    // Act / Assert
    expect(planArea(bowTie)).toEqual({ ok: false, reason: 'se-cruza' });
  });
});

describe('fitTapeScale', () => {
  it('with no tape, keeps the AR plan and says the source is AR alone', () => {
    // Act
    const fitted = fitTapeScale(RECTANGLE, []);

    // Assert
    expect(fitted).toEqual(expect.objectContaining({ ok: true, source: 'ar', scale: 1, areaM2: 8, discrepantSides: [], irregularTracking: false }));
  });

  it('one taped side fixes the SLAM drift for the whole plan', () => {
    // Arrange: AR read 2 % short
    const drifted = scaled(0.98);

    // Act
    const fitted = fitTapeScale(drifted, [{ side: 0, lengthM: 4 }]);

    // Assert
    expect(fitted.ok).toBe(true);
    if (!fitted.ok) return;
    expect(fitted.source).toBe('ar+wincha');
    expect(fitted.scale).toBeCloseTo(1 / 0.98, 6);
    expect(fitted.areaM2).toBeCloseTo(8, 6);
    expect(fitted.residuals).toEqual([{ side: 0, cm: 0 }]);
  });

  it('when AR and tape disagree on a side, the tape wins and the side is flagged, never averaged', () => {
    // Arrange: the long sides agree, but the tape says the side 1 is 2.10 m, not 2
    const tape = [
      { side: 0, lengthM: 4 },
      { side: 1, lengthM: 2.1 },
      { side: 2, lengthM: 4 },
    ];

    // Act
    const fitted = fitTapeScale(RECTANGLE, tape);

    // Assert
    expect(fitted.ok).toBe(true);
    if (!fitted.ok) return;
    expect(fitted.discrepantSides).toEqual([1]);
    const [, start, end] = fitted.plan;
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeCloseTo(2.1, 6);
  });

  it('a small disagreement (under 2 cm or 1 %) is not flagged', () => {
    // Act
    const fitted = fitTapeScale(RECTANGLE, [
      { side: 0, lengthM: 4.005 },
      { side: 1, lengthM: 2.0 },
    ]);

    // Assert
    expect(fitted.ok && fitted.discrepantSides).toEqual([]);
  });

  it('warns of irregular tracking when the drift differs by axis more than 2 %', () => {
    // Arrange: AR stretched x by 5 %, y is right
    const stretched = RECTANGLE.map((point) => ({ x: point.x * 1.05, y: point.y }));

    // Act
    const fitted = fitTapeScale(stretched, [
      { side: 0, lengthM: 4 },
      { side: 1, lengthM: 2 },
    ]);

    // Assert
    expect(fitted.ok && fitted.irregularTracking).toBe(true);
  });

  it('ignores a tape entry for a side the plan does not have, or with a length that is not positive', () => {
    // Act
    const fitted = fitTapeScale(RECTANGLE, [
      { side: 9, lengthM: 3 },
      { side: 0, lengthM: 0 },
    ]);

    // Assert
    expect(fitted.ok && fitted.source).toBe('ar');
  });

  it('passes through why a plan cannot be measured', () => {
    expect(fitTapeScale(RECTANGLE.slice(0, 2), [{ side: 0, lengthM: 4 }])).toEqual({ ok: false, reason: 'pocos-vertices' });
  });
});

describe('thicknessStats', () => {
  it('averages the readings in cm, gives the spread and the volume with its ±', () => {
    // Act
    const stats = thicknessStats([5, 5.2, 5.4], 10);

    // Assert
    expect(stats.n).toBe(3);
    expect(stats.meanM).toBeCloseTo(0.052, 6);
    expect(stats.sdM).toBeCloseTo(0.002, 6);
    expect(stats.volumeM3).toBeCloseTo(0.52, 6);
    expect(stats.volumePlusMinusM3).toBeCloseTo((10 * 0.002) / Math.sqrt(3), 6);
    expect(stats.fewReadings).toBe(false);
  });

  it('warns, without blocking, with fewer than three readings, and skips readings that are not positive numbers', () => {
    // Act
    const stats = thicknessStats([5, Number.NaN, -2, 0], 2);

    // Assert
    expect(stats).toEqual(expect.objectContaining({ n: 1, meanM: 0.05, sdM: 0, volumeM3: 0.1, fewReadings: true }));
  });

  it('with no readings there is no volume', () => {
    expect(thicknessStats([], 8)).toEqual({ n: 0, meanM: 0, sdM: 0, volumeM3: 0, volumePlusMinusM3: 0, fewReadings: true });
  });
});
