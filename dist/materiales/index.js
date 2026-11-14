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
 * Materials: the aggregates stock report, the labels that tell two options of
 * the same name apart, the filter of who is a carrier and who a quarry, and the
 * pure rules of a stock movement and of a reception. Shared by Portal and
 * Inframaq so both offer and register the same things.
 */
__exportStar(require("./movementPlan"), exports);
__exportStar(require("./optionLabels"), exports);
__exportStar(require("./providerRole"), exports);
__exportStar(require("./receptionPlan"), exports);
__exportStar(require("./stockReport"), exports);
