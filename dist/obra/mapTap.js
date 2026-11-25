"use strict";
/**
 * How much aim it takes to tap a street on the map.
 *
 * MapLibre does not hit a stroke by the exact pixel: a BOX around the tapped
 * point is queried. How big that box is stopped being a detail with C6
 * (30/08/2026), because tapping the map went from "looking" to WRITING: one tap
 * paints the whole street.
 *
 * With a mouse, 8 px is enough and more would be worse: a big box catches the
 * street next door. With a finger, on the other hand, 8 px means missing often
 * — the stroke is 4 px wide and the finger covers the spot right when you aim.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tapBox = exports.tapTolerancePx = exports.TAP_TOLERANCE_TOUCH_PX = exports.TAP_TOLERANCE_MOUSE_PX = void 0;
/** Mouse box: small on purpose, so it does not catch the neighbouring street. */
exports.TAP_TOLERANCE_MOUSE_PX = 8;
/**
 * Finger box: 16 px radius, 32 px side.
 *
 * It does not reach the recommended 44 px touch target —at that size, two
 * parallel streets one block apart fit in the box together— but it stops being
 * an aiming game. When several fit, MapLibre breaks the tie by returning the
 * topmost one first.
 */
exports.TAP_TOLERANCE_TOUCH_PX = 16;
/**
 * The tolerance that fits the pointer.
 *
 * Without data —SSR, or a browser that does not answer `pointer: coarse`— it
 * assumes a mouse: oversizing paints the wrong street, and that is worse than a
 * tap that missed and gets repeated.
 */
const tapTolerancePx = (isCoarsePointer) => isCoarsePointer === true ? exports.TAP_TOLERANCE_TOUCH_PX : exports.TAP_TOLERANCE_MOUSE_PX;
exports.tapTolerancePx = tapTolerancePx;
/** The box centred on the point, the way `queryRenderedFeatures` expects it. */
const tapBox = (point, tolerance) => [
    [point.x - tolerance, point.y - tolerance],
    [point.x + tolerance, point.y + tolerance],
];
exports.tapBox = tapBox;
