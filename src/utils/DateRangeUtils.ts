import { TimeRangePickerProps } from "antd/lib";
import dayjs from "dayjs";

// Quick ranges offered by every report date filter. Built on demand so
// "Today" is always today, not the day the page was first loaded.
export const rangePresets = (): TimeRangePickerProps["presets"] => {
  const now = dayjs();
  const day = (d: dayjs.Dayjs) => [d.startOf("day"), d.endOf("day")] as [dayjs.Dayjs, dayjs.Dayjs];
  const span = (unit: "week" | "month" | "quarter" | "year", back = 0) => {
    const d = unit === "quarter" ? now.subtract(back * 3, "month") : now.subtract(back, unit);
    return [d.startOf(unit), d.endOf(unit)] as [dayjs.Dayjs, dayjs.Dayjs];
  };
  const last = (days: number) => [now.subtract(days - 1, "day").startOf("day"), now.endOf("day")] as [dayjs.Dayjs, dayjs.Dayjs];

  return [
    { label: "Today", value: day(now) },
    { label: "Yesterday", value: day(now.subtract(1, "day")) },
    { label: "This Week", value: span("week") },
    { label: "Last Week", value: span("week", 1) },
    { label: "Last 7 Days", value: last(7) },
    { label: "This Month", value: span("month") },
    { label: "Last Month", value: span("month", 1) },
    { label: "Last 30 Days", value: last(30) },
    { label: "Last 90 Days", value: last(90) },
    { label: "This Quarter", value: span("quarter") },
    { label: "Last Quarter", value: span("quarter", 1) },
    { label: "This Year", value: span("year") },
    { label: "Last Year", value: span("year", 1) },
  ];
};

export default rangePresets;
