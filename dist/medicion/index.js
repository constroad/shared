"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Measuring an area on the floor, shared by Portal and Lilachat's APK:
 * - `arPlan`: the AR plan fitted by the tape, its area and the thickness readings (`rumbo/specs/MEDICION-AR.spec.md` §3).
 * - `photoMeasurement` (+ `areaMedida`, `areaEscuadra`): the photo + tape measurement that Portal had since 01/09.
 * - `persistedPhotoMetrics`: what a measured photo keeps as its m² and m³ (never the ceiling nor the estimate).
 * - `iaaZones`: the totals of each zone of the IAA from its measured photos.
 */
__exportStar(require("./arPlan"), exports);
__exportStar(require("./arCapture"), exports);
__exportStar(require("./areaMedida"), exports);
__exportStar(require("./areaEscuadra"), exports);
__exportStar(require("./photoMeasurement"), exports);
__exportStar(require("./persistedPhotoMetrics"), exports);
__exportStar(require("./iaaZones"), exports);
