"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.horizontalCylinderVolumeCm3 = horizontalCylinderVolumeCm3;
exports.verticalCylinderVolumeCm3 = verticalCylinderVolumeCm3;
exports.rectangularVolumeCm3 = rectangularVolumeCm3;
exports.cm3ToUsGallons = cm3ToUsGallons;
const PI = Math.PI;
/** Volume (cm³) of fluid in a horizontal cylinder from bottom fill height `h` (cm). `lengthCm` = generatrix, `radiusCm` = cross-section radius. */
function horizontalCylinderVolumeCm3(lengthCm, radiusCm, heightCm) {
    if (heightCm < 0 || heightCm > 2 * radiusCm)
        return null;
    const term1 = (PI * radiusCm * radiusCm) / 2;
    const term2 = (heightCm - radiusCm) * Math.sqrt(2 * radiusCm * heightCm - heightCm * heightCm);
    const term3 = radiusCm * radiusCm * Math.asin((-radiusCm + heightCm) / radiusCm);
    return lengthCm * (term1 + term2 + term3);
}
function verticalCylinderVolumeCm3(radiusCm, heightCm) {
    if (heightCm < 0)
        return null;
    return PI * radiusCm * radiusCm * heightCm;
}
function rectangularVolumeCm3(lengthCm, widthCm, heightCm) {
    if (heightCm < 0)
        return null;
    return lengthCm * widthCm * heightCm;
}
function cm3ToUsGallons(cm3, cubicCmPerUsGallon) {
    return cm3 / cubicCmPerUsGallon;
}
