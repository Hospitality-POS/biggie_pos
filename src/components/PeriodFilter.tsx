import React from "react";
import { DatePicker, Segmented, Space, Typography } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// Month / calendar quarter / year picked with a single picker, or a custom range
export type PeriodMode = "month" | "quarter" | "year" | "custom";

export interface PeriodValue {
    mode: PeriodMode;
    anchor: dayjs.Dayjs;
    custom: [dayjs.Dayjs, dayjs.Dayjs];
}

export const defaultPeriod = (): PeriodValue => ({
    mode: "month",
    anchor: dayjs(),
    custom: [dayjs().startOf("month"), dayjs().endOf("month")],
});

// Start/end of the calendar month, quarter (Jan–Mar, Apr–Jun…) or year that
// `anchor` falls in. Quarters are computed by hand — dayjs needs a plugin for them.
export const periodRange = (p: PeriodValue): [dayjs.Dayjs, dayjs.Dayjs] => {
    if (p.mode === "custom") return p.custom;
    if (p.mode === "year") return [p.anchor.startOf("year"), p.anchor.endOf("year")];
    if (p.mode === "quarter") {
        const start = p.anchor.month(Math.floor(p.anchor.month() / 3) * 3).startOf("month");
        return [start, start.add(2, "month").endOf("month")];
    }
    return [p.anchor.startOf("month"), p.anchor.endOf("month")];
};

// True when the filter is not on the current month (shown by "Clear filters")
export const isDefaultPeriod = (p: PeriodValue) => p.mode === "month" && p.anchor.isSame(dayjs(), "month");

const PeriodFilter: React.FC<{ value: PeriodValue; onChange: (v: PeriodValue) => void }> = ({ value, onChange }) => {
    const [from, to] = periodRange(value);
    return (
        <Space wrap size={8}>
            <Segmented
                value={value.mode}
                onChange={(m) => onChange({ ...value, mode: m as PeriodMode })}
                options={[
                    { label: "Month", value: "month" },
                    { label: "Quarter", value: "quarter" },
                    { label: "Year", value: "year" },
                    { label: "Custom", value: "custom" },
                ]}
            />
            {value.mode === "custom" ? (
                <RangePicker
                    value={value.custom}
                    onChange={(v) => { if (v?.[0] && v?.[1]) onChange({ ...value, custom: [v[0], v[1]] }); }}
                    style={{ borderRadius: 8 }}
                    presets={[
                        { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
                        { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
                        { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                        { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                        { label: "Last 90 Days", value: [dayjs().subtract(90, "day").startOf("day"), dayjs().endOf("day")] },
                    ]}
                />
            ) : (
                <DatePicker
                    picker={value.mode}
                    value={value.anchor}
                    allowClear={false}
                    format={value.mode === "quarter" ? "YYYY-[Q]Q" : value.mode === "year" ? "YYYY" : "MMM YYYY"}
                    onChange={(v) => { if (v) onChange({ ...value, anchor: v }); }}
                    style={{ borderRadius: 8, width: 140 }}
                />
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
                {from.format("DD MMM YYYY")} – {to.format("DD MMM YYYY")}
            </Text>
        </Space>
    );
};

export default PeriodFilter;
