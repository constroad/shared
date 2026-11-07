/** Volume (cm³) of fluid in a horizontal cylinder from bottom fill height `h` (cm). `lengthCm` = generatrix, `radiusCm` = cross-section radius. */
export declare function horizontalCylinderVolumeCm3(lengthCm: number, radiusCm: number, heightCm: number): number | null;
export declare function verticalCylinderVolumeCm3(radiusCm: number, heightCm: number): number | null;
export declare function rectangularVolumeCm3(lengthCm: number, widthCm: number, heightCm: number): number | null;
export declare function cm3ToUsGallons(cm3: number, cubicCmPerUsGallon: number): number;
