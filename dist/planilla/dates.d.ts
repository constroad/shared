/** Calendar dates as `YYYY-MM-DD` strings (Lima). Noon UTC keeps every operation off daylight-saving edges. */
export declare const addDaysIso: (date: string, days: number) => string;
/** 0 = Sunday … 6 = Saturday. */
export declare const dateWeekday: (date: string) => number;
export declare const mondayOf: (date: string) => string;
