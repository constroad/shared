"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.num = void 0;
/** A number as Lila says it: at most two decimals, and 0 for what is not a number. */
const num = (value) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
exports.num = num;
