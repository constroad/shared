export declare const todayPeruInputDate: () => string;
export declare const daysAgoPeruInputDate: (days: number) => string;
export declare const shiftPeruInputDate: (dateInput: string, days: number) => string;
export declare const formatPeruDateTime: (value: string | Date) => string;
export declare const formatPeruDate: (value: string | Date) => string;
export declare const toPeruInputDate: (value: string | Date) => string;
export declare const currentPeruInputTime: () => string;
export declare const toPeruInputTime: (value: string | Date) => string;
export declare const toPeruCalendarInputDate: (value: string | Date) => string;
export declare const buildPeruDateRange: (startDate: string | Date, endDate: string | Date) => {
    end: Date;
    start: Date;
};
export declare const combinePeruInputDateAndTime: (dateInput: string, timeInput: string) => string;
export declare const combinePeruInputDateWithCurrentTime: (dateInput: string) => string;
