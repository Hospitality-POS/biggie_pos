export interface Shift {
    employee_id: string;
    _id: string;
    day: string;
    time: {
        start: moment.Moment; // Make sure to reflect the structure
        end: moment.Moment;
    };
}
