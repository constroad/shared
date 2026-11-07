import { projectToLine, type LatLng } from './streetGeometry';

/** How far a point can stray from the axis and still be the same street. */
const SAME_PIECE_M = 20;

/**
 * Is the tapped trace the SAME PIECE of asphalt as the one already in the area?
 *
 * The picker rejected by NAME: tapping the continuation of "Jirón Miguel Grau"
 * answered "already in the area" and added nothing, so José had to name it
 * "Grau 2" to get it in. The name is not enough — a long road comes in several
 * chains and they all share the name.
 *
 * GEOMETRY decides: if the tapped trace lies on top of the existing one, it is
 * the same piece and there is nothing to add; if it falls outside, it is
 * another part of the street and goes in as its own row, ready to be merged by
 * hand.
 */
export const isSamePieceOfStreet = (existing: LatLng[], tapped: LatLng[]): boolean => {
  if (!(existing?.length >= 2) || !(tapped?.length >= 2)) return false;
  // BOTH ends and the middle are checked: a piece that starts on the street
  // and goes beyond it has to count as new.
  const samples = [tapped[0], tapped[Math.floor(tapped.length / 2)], tapped[tapped.length - 1]];
  return samples.every((point) => {
    const projected = projectToLine(existing, point);
    return Boolean(projected && projected.distanceM <= SAME_PIECE_M);
  });
};
