import React from "react";
import { Space, DatePicker, Button, Select, Typography, Tooltip } from "antd";
import {
    SearchOutlined,
    DownloadOutlined,
    FilterOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Period filter (from / to) ──────────────────────────────────────────────────

interface PeriodFilterProps {
    value: [Dayjs | null, Dayjs | null];
    onChange: (v: [Dayjs | null, Dayjs | null]) => void;
    onRun: () => void;
    loading?: boolean;
    extra?: React.ReactNode;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
    value, onChange, onRun, loading, extra,
}) => (
    <Space wrap style={{ marginBottom: 16 }}>
        <FilterOutlined style={{ color: "#8c8c8c" }} />
        <RangePicker
            value={value}
            onChange={(r) => onChange(r as [Dayjs | null, Dayjs | null])}
            allowClear={false}
            format="DD MMM YYYY"
            presets={[
                { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                { label: "This Quarter", value: [dayjs().startOf("quarter"), dayjs().endOf("quarter")] },
                { label: "Last Quarter", value: [dayjs().subtract(1, "quarter").startOf("quarter"), dayjs().subtract(1, "quarter").endOf("quarter")] },
                { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
                { label: "Last Year", value: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] },
                { label: "Last 30 Days", value: [dayjs().subtract(30, "day"), dayjs()] },
                { label: "Last 90 Days", value: [dayjs().subtract(90, "day"), dayjs()] },
            ]}
        />
        {extra}
        <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={onRun}
        >
            Run Report
        </Button>
    </Space>
);

// ── As-of date filter (snapshot reports) ──────────────────────────────────────

interface AsOfFilterProps {
    value: Dayjs | null;
    onChange: (v: Dayjs | null) => void;
    onRun: () => void;
    loading?: boolean;
    extra?: React.ReactNode;
}

export const AsOfFilter: React.FC<AsOfFilterProps> = ({
    value, onChange, onRun, loading, extra,
}) => (
    <Space wrap style={{ marginBottom: 16 }}>
        <FilterOutlined style={{ color: "#8c8c8c" }} />
        <Text type="secondary">As of:</Text>
        <DatePicker
            value={value}
            onChange={onChange}
            format="DD MMM YYYY"
            allowClear={false}
            presets={[
                { label: "Today", value: dayjs() },
                { label: "End of Last Month", value: dayjs().subtract(1, "month").endOf("month") },
                { label: "End of Last Year", value: dayjs().subtract(1, "year").endOf("year") },
            ]}
        />
        {extra}
        <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={onRun}
        >
            Run Report
        </Button>
    </Space>
);

// ── Export / Print helper ─────────────────────────────────────────────────────

interface ExportButtonProps {
    onExport: () => void;
    disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport, disabled }) => (
    <Tooltip title="Export to CSV">
        <Button icon={<DownloadOutlined />} onClick={onExport} disabled={disabled}>
            Export
        </Button>
    </Tooltip>
);

// ── Generic CSV exporter ───────────────────────────────────────────────────────

export const exportToCSV = (filename: string, rows: Record<string, any>[]) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(","),
        ...rows.map((row) =>
            headers.map((h) => {
                const val = row[h] ?? "";
                const str = String(val).replace(/"/g, '""');
                return str.includes(",") || str.includes('"') ? `"${str}"` : str;
            }).join(",")
        ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};