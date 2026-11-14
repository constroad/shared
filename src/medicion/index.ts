/**
 * Measuring an area on the floor, shared by Portal and Lilachat's APK:
 * - `arPlan`: the AR plan fitted by the tape, its area and the thickness readings (`rumbo/specs/MEDICION-AR.spec.md` §3).
 * - `photoMeasurement` (+ `areaMedida`, `areaEscuadra`): the photo + tape measurement that Portal had since 01/09.
 * - `persistedPhotoMetrics`: what a measured photo keeps as its m² and m³ (never the ceiling nor the estimate).
 * - `iaaZones`: the totals of each zone of the IAA from its measured photos.
 */
export * from './arPlan';
export * from './arCapture';
export * from './areaMedida';
export * from './areaEscuadra';
export * from './photoMeasurement';
export * from './persistedPhotoMetrics';
export * from './iaaZones';
