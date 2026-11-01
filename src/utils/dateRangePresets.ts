import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import type { TimeRangePickerProps } from "antd";

dayjs.extend(quarterOfYear);

// Quick picks for every dashboard's custom RangePicker, so Duka, Pesa, Mteja and
// Bandu all offer the same periods.
export const CUSTOM_RANGE_PRESETS: TimeRangePickerProps["presets"] = [
  { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
  { label: "Yesterday", value: [dayjs().subtract(1, "day").startOf("day"), dayjs().subtract(1, "day").endOf("day")] },
  { label: "Last 7 Days", value: [dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day")] },
  { label: "Last 30 Days", value: [dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")] },
  { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
  { label: "Last Week", value: [dayjs().subtract(1, "week").startOf("week"), dayjs().subtract(1, "week").endOf("week")] },
  { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
  { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
  { label: "This Quarter", value: [dayjs().startOf("quarter"), dayjs().endOf("quarter")] },
  { label: "Last Quarter", value: [dayjs().subtract(3, "month").startOf("quarter"), dayjs().subtract(3, "month").endOf("quarter")] },
  { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
  { label: "Last Year", value: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] },
];
