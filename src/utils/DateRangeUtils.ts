import { TimeRangePickerProps } from "antd/lib";
import dayjs from "dayjs";

export const rangePresets = (): TimeRangePickerProps["presets"] => [
  { label: "Last 7 Days", value: [dayjs().add(-7, "d"), dayjs()] },
  { label: "Last 14 Days", value: [dayjs().add(-14, "d"), dayjs()] },
  { label: "Last 30 Days", value: [dayjs().add(-30, "d"), dayjs()] },
  { label: "Last 90 Days", value: [dayjs().add(-90, "d"), dayjs()] },
  { label: "Last 6 Months", value: [dayjs().add(-6, "M"), dayjs()] },
  { label: "Last 12 Months", value: [dayjs().add(-12, "M"), dayjs()] },
];

export default rangePresets;
