const PI = Math.PI;

/** Volume (cm³) of fluid in a horizontal cylinder from bottom fill height `h` (cm). `lengthCm` = generatrix, `radiusCm` = cross-section radius. */
export function horizontalCylinderVolumeCm3(
  lengthCm: number,
  radiusCm: number,
  heightCm: number
): number | null {
  if (heightCm < 0 || heightCm > 2 * radiusCm) return null;

  const term1 = (PI * radiusCm * radiusCm) / 2;
  const term2 =
    (heightCm - radiusCm) * Math.sqrt(2 * radiusCm * heightCm - heightCm * heightCm);
  const term3 = radiusCm * radiusCm * Math.asin((-radiusCm + heightCm) / radiusCm);

  return lengthCm * (term1 + term2 + term3);
}

export function verticalCylinderVolumeCm3(radiusCm: number, heightCm: number): number | null {
  if (heightCm < 0) return null;
  return PI * radiusCm * radiusCm * heightCm;
}

export function rectangularVolumeCm3(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number | null {
  if (heightCm < 0) return null;
  return lengthCm * widthCm * heightCm;
}

export function cm3ToUsGallons(cm3: number, cubicCmPerUsGallon: number): number {
  return cm3 / cubicCmPerUsGallon;
}
