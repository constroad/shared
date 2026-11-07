type DateValue = string | Date;
export interface ConsumePeriodFields {
    date: DateValue;
    createdAt?: DateValue;
    periodStart?: DateValue;
    periodEnd?: DateValue;
}
export declare const consumePeriodTime: (consume: ConsumePeriodFields) => number;
export declare const consumePeriodLabel: (consume: ConsumePeriodFields) => string;
export {};
