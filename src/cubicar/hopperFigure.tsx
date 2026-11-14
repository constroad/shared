import type { CubicageMeasures, TruckShape } from '../flota/cubicage';

/**
 * The hopper drawn from its own measures, with each dimension labeled with its value, like the
 * stockpile of chancadora's cubicage (José, 14/11/2026: the old drawing «está horrible»). Two views:
 * the cross-section (width and heights, and the concave bottom) and the side (length). Plain SVG in
 * the ink of the page, so it prints the same on screen and in the PDF.
 */

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 230;
const SECTION_BOX = { x: 95, y: 34, width: 215, height: 140 };
const SIDE_BOX = { x: 440, y: 34, width: 150, height: 140 };
/** View titles go under the drawings, clear of the dimensions above them. */
const TITLE_Y = VIEW_HEIGHT - 4;
const DIMENSION_GAP = 18;
const TICK = 5;
const DECIMALS = 2;

const metersOf = (measures: CubicageMeasures, key: keyof CubicageMeasures): number => Math.max(0, Number(measures[key] ?? 0));
const label = (code: string, meters: number): string => `${code} = ${meters.toFixed(DECIMALS)} m`;

type Point = { x: number; y: number };

/** A dimension line with its two ticks and the label at the middle. */
const Dimension = ({ from, to, text, side }: { from: Point; to: Point; text: string; side: 'above' | 'below' | 'left' | 'right' }) => {
  const vertical = from.x === to.x;
  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const tick = (point: Point) => (vertical ? `M${point.x - TICK},${point.y} H${point.x + TICK}` : `M${point.x},${point.y - TICK} V${point.y + TICK}`);
  const textAt = {
    above: { x: middle.x, y: middle.y - 6, anchor: 'middle' as const },
    below: { x: middle.x, y: middle.y + 13, anchor: 'middle' as const },
    left: { x: middle.x - 8, y: middle.y + 3, anchor: 'end' as const },
    right: { x: middle.x + 8, y: middle.y + 3, anchor: 'start' as const },
  }[side];
  return (
    <g className="dim">
      <path d={`M${from.x},${from.y} L${to.x},${to.y} ${tick(from)} ${tick(to)}`} />
      <text x={textAt.x} y={textAt.y} textAnchor={textAt.anchor}>
        {text}
      </text>
    </g>
  );
};

interface Scaled {
  x0: number;
  y0: number;
  width: number;
  height: number;
  scale: number;
}

const scaledSection = (widthM: number, heightM: number): Scaled => {
  const scale = Math.min(SECTION_BOX.width / (widthM || 1), SECTION_BOX.height / (heightM || 1));
  const width = widthM * scale;
  const height = heightM * scale;
  return { x0: SECTION_BOX.x + (SECTION_BOX.width - width) / 2, y0: SECTION_BOX.y + (SECTION_BOX.height - height) / 2, width, height, scale };
};

const concavePath = (box: Scaled, squareM: number, leftM: number, rightM: number): string => {
  const { x0, y0, width, height, scale } = box;
  const square = squareM * scale;
  const left = leftM * scale;
  const right = rightM * scale;
  const curve = height - square;
  return [
    `M${x0},${y0} H${x0 + width} V${y0 + square}`,
    `A${right},${curve} 0 0 1 ${x0 + width - right},${y0 + height}`,
    `H${x0 + left}`,
    `A${left},${curve} 0 0 1 ${x0},${y0 + square} Z`,
  ].join(' ');
};

const ConcaveDimensions = ({ box, measures }: { box: Scaled; measures: CubicageMeasures }) => {
  const { x0, y0, width, height, scale } = box;
  const square = metersOf(measures, 'squareHeight') * scale;
  const left = metersOf(measures, 'leftConcaveWidth') * scale;
  const center = metersOf(measures, 'centralConcaveWidth') * scale;
  const xLeft = x0 - DIMENSION_GAP;
  const yBottom = y0 + height + DIMENSION_GAP;
  return (
    <>
      <Dimension from={{ x: xLeft, y: y0 }} to={{ x: xLeft, y: y0 + square }} text={label('A5', metersOf(measures, 'squareHeight'))} side="left" />
      <Dimension from={{ x: xLeft, y: y0 + square }} to={{ x: xLeft, y: y0 + height }} text={label('A4', metersOf(measures, 'concaveHight'))} side="left" />
      <Dimension from={{ x: x0, y: yBottom }} to={{ x: x0 + left, y: yBottom }} text="B1" side="below" />
      <Dimension from={{ x: x0 + left, y: yBottom }} to={{ x: x0 + left + center, y: yBottom }} text={label('B2', metersOf(measures, 'centralConcaveWidth'))} side="below" />
      <Dimension from={{ x: x0 + left + center, y: yBottom }} to={{ x: x0 + width, y: yBottom }} text="B3" side="below" />
      <line className="guide" x1={x0} y1={y0 + square} x2={x0 + width} y2={y0 + square} />
    </>
  );
};

const Section = ({ shape, measures }: { shape: TruckShape; measures: CubicageMeasures }) => {
  const widthM = metersOf(measures, 'totalWidth');
  const heightM = metersOf(measures, 'totalHeight');
  const box = scaledSection(widthM, heightM);
  const { x0, y0, width, height } = box;
  const concave = shape === 'Concavo';
  const outline = concave ? concavePath(box, metersOf(measures, 'squareHeight'), metersOf(measures, 'leftConcaveWidth'), metersOf(measures, 'rightConcaveWidth')) : `M${x0},${y0} h${width} v${height} h${-width} Z`;
  return (
    <g>
      <text className="view-title" x={SECTION_BOX.x + SECTION_BOX.width / 2} y={TITLE_Y} textAnchor="middle">
        Sección transversal
      </text>
      <path className="hopper" d={outline} />
      <Dimension from={{ x: x0, y: y0 - DIMENSION_GAP }} to={{ x: x0 + width, y: y0 - DIMENSION_GAP }} text={label('A1', widthM)} side="above" />
      <Dimension from={{ x: x0 + width + DIMENSION_GAP, y: y0 }} to={{ x: x0 + width + DIMENSION_GAP, y: y0 + height }} text={label('A3', heightM)} side="right" />
      {concave ? <ConcaveDimensions box={box} measures={measures} /> : null}
    </g>
  );
};

const Side = ({ measures }: { measures: CubicageMeasures }) => {
  const lengthM = metersOf(measures, 'totalLength');
  const heightM = metersOf(measures, 'totalHeight');
  const scale = Math.min(SIDE_BOX.width / (lengthM || 1), SIDE_BOX.height / (heightM || 1));
  const width = lengthM * scale;
  const height = heightM * scale;
  const x0 = SIDE_BOX.x + (SIDE_BOX.width - width) / 2;
  const y0 = SIDE_BOX.y + (SIDE_BOX.height - height) / 2;
  return (
    <g>
      <text className="view-title" x={SIDE_BOX.x + SIDE_BOX.width / 2} y={TITLE_Y} textAnchor="middle">
        Vista lateral
      </text>
      <rect className="hopper" x={x0} y={y0} width={width} height={height} />
      <Dimension from={{ x: x0, y: y0 + height + DIMENSION_GAP }} to={{ x: x0 + width, y: y0 + height + DIMENSION_GAP }} text={label('A2', lengthM)} side="below" />
    </g>
  );
};

export const HopperFigure = ({ shape, measures, title }: { shape: TruckShape; measures: CubicageMeasures; title: string }) => (
  <svg className="hopper-figure" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={title}>
    <Section shape={shape} measures={measures} />
    <Side measures={measures} />
  </svg>
);
