import { type LatLng } from './streetGeometry';
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
export declare const isSamePieceOfStreet: (existing: LatLng[], tapped: LatLng[]) => boolean;
