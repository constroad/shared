"use strict";
/** Calendar dates as `YYYY-MM-DD` strings (Lima). Noon UTC keeps every operation off daylight-saving edges. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mondayOf = exports.dateWeekday = exports.addDaysIso = void 0;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONDAY_OFFSET = 6;
const WEEK_DAYS = 7;
const noonOf = (date) => Date.parse(`${date}T12:00:00Z`);
const addDaysIso = (date, days) => new Date(noonOf(date) + days * DAY_MS).toISOString().slice(0, 10);
exports.addDaysIso = addDaysIso;
/** 0 = Sunday … 6 = Saturday. */
const dateWeekday = (date) => new Date(noonOf(date)).getUTCDay();
exports.dateWeekday = dateWeekday;
const mondayOf = (date) => (0, exports.addDaysIso)(date, -(((0, exports.dateWeekday)(date) + MONDAY_OFFSET) % WEEK_DAYS));
exports.mondayOf = mondayOf;
