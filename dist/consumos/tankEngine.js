"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submergedSerpentineDisplacementGallons = submergedSerpentineDisplacementGallons;
exports.geometricGallonsAtLevel = geometricGallonsAtLevel;
exports.computeValveDeadGallonsFromGeometry = computeValveDeadGallonsFromGeometry;
exports.resolveValveDeadGallons = resolveValveDeadGallons;
exports.availableForProductionGallons = availableForProductionGallons;
exports.consumptionGallons = consumptionGallons;
exports.productionM3FromAvailableGallons = productionM3FromAvailableGallons;
exports.tankEventFromGallons = tankEventFromGallons;
exports.tankDocumentToCalculationInput = tankDocumentToCalculationInput;
const geometry_1 = require("./geometry");
function err(code, message) {
    return { ok: false, code, message };
}
/** Sum displaced volume (gal) for serpentines fully below the liquid surface. */
function submergedSerpentineDisplacementGallons(serpentines, levelCm) {
    return serpentines
        .filter((s) => levelCm > s.heightFromBottomCm)
        .reduce((acc, s) => acc + s.displacedVolumeGallons, 0);
}
function maxDipstickCm(input) {
    const calibrationTable = normalizeCalibrationTable(input.calibrationTable);
    const calibrationMax = calibrationTable[calibrationTable.length - 1]?.levelCentimeter;
    if (calibrationMax !== undefined)
        return calibrationMax;
    const { tankShape, geometry } = input;
    if (tankShape === 'horizontal_cylinder') {
        const d = geometry.diameterCm;
        if (typeof d !== 'number' || d <= 0)
            return null;
        return d;
    }
    if (tankShape === 'vertical_cylinder') {
        const h = geometry.heightCm;
        if (typeof h !== 'number' || h <= 0)
            return null;
        return h;
    }
    if (tankShape === 'rectangular') {
        const m = geometry.maxHeightCm;
        if (typeof m !== 'number' || m <= 0)
            return null;
        return m;
    }
    return null;
}
function normalizeCalibrationTable(calibrationTable) {
    return (calibrationTable ?? [])
        .filter((point) => Number.isFinite(point.levelCentimeter) &&
        Number.isFinite(point.effectiveGallons) &&
        point.levelCentimeter >= 0 &&
        point.effectiveGallons >= 0)
        .sort((leftPoint, rightPoint) => leftPoint.levelCentimeter - rightPoint.levelCentimeter)
        .reduce((points, point) => {
        const previousPoint = points[points.length - 1];
        if (previousPoint?.levelCentimeter === point.levelCentimeter) {
            points[points.length - 1] = point;
            return points;
        }
        return [...points, point];
    }, []);
}
function calibratedGallonsAtLevel(input, levelCm) {
    const calibrationTable = normalizeCalibrationTable(input.calibrationTable);
    if (calibrationTable.length < 2)
        return null;
    const maxLevel = calibrationTable[calibrationTable.length - 1]?.levelCentimeter ?? 0;
    if (levelCm > maxLevel) {
        return err('LEVEL_ABOVE_MAX', `La medida supera la altura máxima (${maxLevel} cm)`);
    }
    const exactPoint = calibrationTable.find((point) => point.levelCentimeter === levelCm);
    if (exactPoint) {
        return {
            ok: true,
            geometricGallons: exactPoint.effectiveGallons,
            serpentineDisplacementGallons: 0,
            effectiveGallons: exactPoint.effectiveGallons,
        };
    }
    const tableWithOrigin = calibrationTable[0]?.levelCentimeter === 0
        ? calibrationTable
        : [{ levelCentimeter: 0, effectiveGallons: 0 }, ...calibrationTable];
    const upperIndex = tableWithOrigin.findIndex((point) => point.levelCentimeter > levelCm);
    const lowerPoint = upperIndex <= 0 ? tableWithOrigin[0] : tableWithOrigin[upperIndex - 1];
    const upperPoint = upperIndex < 0
        ? tableWithOrigin[tableWithOrigin.length - 1]
        : tableWithOrigin[upperIndex];
    if (!lowerPoint || !upperPoint || upperPoint.levelCentimeter === lowerPoint.levelCentimeter) {
        return err('INVALID_GEOMETRY', 'Tabla calibrada inválida');
    }
    const ratio = (levelCm - lowerPoint.levelCentimeter) /
        (upperPoint.levelCentimeter - lowerPoint.levelCentimeter);
    const effectiveGallons = lowerPoint.effectiveGallons +
        (upperPoint.effectiveGallons - lowerPoint.effectiveGallons) * ratio;
    return {
        ok: true,
        geometricGallons: effectiveGallons,
        serpentineDisplacementGallons: 0,
        effectiveGallons,
    };
}
function geometricGallonsAtLevel(input, levelCm) {
    const maxCm = maxDipstickCm(input);
    if (maxCm === null) {
        return err('INVALID_GEOMETRY', 'Geometría incompleta o inválida');
    }
    if (levelCm < 0) {
        return err('LEVEL_BELOW_ZERO', 'La medida no puede ser negativa');
    }
    if (levelCm > maxCm) {
        return err('LEVEL_ABOVE_MAX', `La medida supera la altura máxima (${maxCm} cm)`);
    }
    const calibrated = calibratedGallonsAtLevel(input, levelCm);
    if (calibrated)
        return calibrated;
    const { tankShape, geometry, cubicCmPerUsGallon } = input;
    let cm3 = null;
    if (tankShape === 'horizontal_cylinder') {
        const lengthCm = geometry.lengthCm;
        const diameterCm = geometry.diameterCm;
        if (typeof lengthCm !== 'number' || typeof diameterCm !== 'number') {
            return err('INVALID_GEOMETRY', 'Faltan lengthCm o diameterCm');
        }
        const radiusCm = diameterCm / 2;
        cm3 = (0, geometry_1.horizontalCylinderVolumeCm3)(lengthCm, radiusCm, levelCm);
    }
    else if (tankShape === 'vertical_cylinder') {
        const diameterCm = geometry.diameterCm;
        if (typeof diameterCm !== 'number') {
            return err('INVALID_GEOMETRY', 'Falta diameterCm');
        }
        const radiusCm = diameterCm / 2;
        cm3 = (0, geometry_1.verticalCylinderVolumeCm3)(radiusCm, levelCm);
    }
    else {
        const lengthCm = geometry.lengthCm;
        const widthCm = geometry.widthCm;
        if (typeof lengthCm !== 'number' || typeof widthCm !== 'number') {
            return err('INVALID_GEOMETRY', 'Faltan lengthCm o widthCm');
        }
        cm3 = (0, geometry_1.rectangularVolumeCm3)(lengthCm, widthCm, levelCm);
    }
    if (cm3 === null) {
        return err('INVALID_GEOMETRY', 'No se pudo calcular el volumen');
    }
    const geometricGallons = (0, geometry_1.cm3ToUsGallons)(cm3, cubicCmPerUsGallon);
    const serpentineDisplacementGallons = submergedSerpentineDisplacementGallons(input.serpentines, levelCm);
    const effectiveGallons = Math.max(0, geometricGallons - serpentineDisplacementGallons);
    const result = {
        ok: true,
        geometricGallons,
        serpentineDisplacementGallons,
        effectiveGallons,
    };
    return result;
}
/**
 * Galones bajo la altura de válvula (volumen no utilizable por encima del fondo hasta la cinta),
 * ignorando cualquier override manual en `valveDeadVolumeGallons`.
 */
function computeValveDeadGallonsFromGeometry(input) {
    const cleared = { ...input, valveDeadVolumeGallons: undefined };
    const r = resolveValveDeadGallons(cleared);
    if (typeof r === 'number')
        return Number.isFinite(r) ? r : null;
    if (r.ok)
        return r.effectiveGallons;
    return null;
}
/** Galones muertos por válvula: override explícito o fluido efectivo hasta la cinta de válvula. */
function resolveValveDeadGallons(input) {
    if (input.valveDeadVolumeGallons !== undefined &&
        input.valveDeadVolumeGallons !== null) {
        return input.valveDeadVolumeGallons;
    }
    if (input.valveHeightFromBottomCm === undefined || input.valveHeightFromBottomCm === null) {
        return 0;
    }
    return geometricGallonsAtLevel(input, input.valveHeightFromBottomCm);
}
function availableForProductionGallons(input, levelCm) {
    const atLevel = geometricGallonsAtLevel(input, levelCm);
    if (!atLevel.ok)
        return atLevel;
    const deadResolved = resolveValveDeadGallons(input);
    if (typeof deadResolved !== 'number' && !deadResolved.ok) {
        return deadResolved;
    }
    let valveDeadGallons;
    if (typeof deadResolved === 'number') {
        valveDeadGallons = deadResolved;
    }
    else {
        valveDeadGallons = deadResolved.effectiveGallons;
    }
    const availableGallons = Math.max(0, atLevel.effectiveGallons - valveDeadGallons);
    return { ok: true, availableGallons, valveDeadGallons };
}
function consumptionGallons(input, initialCm, finalCm) {
    const initial = geometricGallonsAtLevel(input, initialCm);
    if (!initial.ok)
        return initial;
    const final = geometricGallonsAtLevel(input, finalCm);
    if (!final.ok)
        return final;
    const consumptionGallons = initial.effectiveGallons - final.effectiveGallons;
    return {
        ok: true,
        consumptionGallons,
        initial,
        final,
    };
}
function productionM3FromAvailableGallons(availableGallons, gallonsPerProductionM3) {
    if (gallonsPerProductionM3 == null || gallonsPerProductionM3 <= 0)
        return null;
    return +(availableGallons / gallonsPerProductionM3).toFixed(4);
}
/** Map documento / JSON a input del motor. */
/** Readings are saved with this many decimals: `toFixed` on the screen and in `tankMovementFromLevel`. */
const SAVED_GALLON_DECIMALS = 2;
/**
 * Whether a reading is a refill, compared at the precision it is saved with.
 *
 * The engine's gallons carry every decimal and the previous reading is already
 * rounded, so the same level counted as «went up» whenever that rounding went
 * down: a refill of 0.00 gallons (05/11/2026).
 */
function tankEventFromGallons(currentGallons, previousGallons) {
    const saved = (gallons) => Number(gallons.toFixed(SAVED_GALLON_DECIMALS));
    return saved(currentGallons) > saved(previousGallons) ? 'refill' : 'measurement';
}
function tankDocumentToCalculationInput(doc) {
    return {
        tankShape: doc.tankShape,
        geometry: { ...doc.geometry },
        cubicCmPerUsGallon: doc.cubicCmPerUsGallon,
        valveHeightFromBottomCm: doc.valveHeightFromBottomCm,
        valveDeadVolumeGallons: doc.valveDeadVolumeGallons,
        serpentines: (doc.serpentines ?? []).map((s) => ({ ...s })),
        calibrationTable: (doc.calibrationTable ?? []).map((point) => ({ ...point })),
        gallonsPerProductionM3: doc.gallonsPerProductionM3,
    };
}
