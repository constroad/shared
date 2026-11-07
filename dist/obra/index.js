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
 * The work map: streets, stretches, progress and what the client sees.
 * Shared by Portal (admin and client report) and Lilachat (web and APK), so
 * both draw the same metres, the same percentages and the same colours.
 * The street editor's pure engine (tile stitching, tap box, OSRM match path
 * and trust, map layers) lives here too, so both edit streets the same way.
 */
__exportStar(require("./streetGeometry"), exports);
__exportStar(require("./streetProgress"), exports);
__exportStar(require("./streetLength"), exports);
__exportStar(require("./scopeMetrics"), exports);
__exportStar(require("./partidaColors"), exports);
__exportStar(require("./workTags"), exports);
__exportStar(require("./progressTimeline"), exports);
__exportStar(require("./kmStrip"), exports);
__exportStar(require("./workMapOverview"), exports);
__exportStar(require("./clientWorkStreets"), exports);
__exportStar(require("./discharges"), exports);
__exportStar(require("./dischargeStretches"), exports);
__exportStar(require("./dispatchClientFacingM3"), exports);
__exportStar(require("./kmzExport"), exports);
__exportStar(require("./zipStore"), exports);
__exportStar(require("./tileGeometry"), exports);
__exportStar(require("./basemapStreet"), exports);
__exportStar(require("./streetPieces"), exports);
__exportStar(require("./streetMatch"), exports);
__exportStar(require("./matchTrust"), exports);
__exportStar(require("./mapTap"), exports);
__exportStar(require("./mapLayers"), exports);
