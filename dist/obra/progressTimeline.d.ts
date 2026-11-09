import type { StreetProgressEvent } from './streetProgress';
/**
 * The days a work had activity, numbered.
 *
 * It is the "día 1 / día 2 / día 3" the Civil 3D drawing drew by hand, and here
 * it comes for free: events are dated, so the work can be rebuilt at any date.
 * It feeds the client report's slider.
 *
 * Only APPROVED work counts: the client is not shown what the resident
 * engineer has not reviewed yet.
 */
export interface ProgressDay {
    /** `YYYY-MM-DD`. */
    date: string;
    /** 1 for the first working day, 2 for the next… */
    dayNumber: number;
}
export declare const progressDays: (events: StreetProgressEvent[]) => ProgressDay[];
