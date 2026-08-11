import React, { useState } from "react";
import {
    Space, DatePicker, Button, Typography, Tooltip,
    Switch, Tag, Divider, InputNumber, Dropdown,
} from "antd";
import {
    SearchOutlined, DownloadOutlined, FilterOutlined, SwapOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

export interface ComparativePeriod {
    primary: [Dayjs | null, Dayjs | null];
    compare: [Dayjs | null, Dayjs | null];
    enabled: boolean;
}

export interface ComparativeAsOf {
    primary: Dayjs | null;
    compare: Dayjs | null;
    enabled: boolean;
}

export interface GLPeriodValue {
    from: string;
    to: string;
    label: string;
}

export const PERIOD_PRESETS = [
    { label: "This Month", value: () => [dayjs().startOf("month"), dayjs().endOf("month")] as [Dayjs, Dayjs] },
    { label: "Last Month", value: () => [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] as [Dayjs, Dayjs] },
    { label: "This Quarter", value: () => [dayjs().startOf("quarter"), dayjs().endOf("quarter")] as [Dayjs, Dayjs] },
    { label: "Last Quarter", value: () => [dayjs().subtract(1, "quarter").startOf("quarter"), dayjs().subtract(1, "quarter").endOf("quarter")] as [Dayjs, Dayjs] },
    { label: "This Year", value: () => [dayjs().startOf("year"), dayjs().endOf("year")] as [Dayjs, Dayjs] },
    { label: "Last Year", value: () => [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] as [Dayjs, Dayjs] },
];

export const suggestComparePeriod = (period: [Dayjs | null, Dayjs | null]): [Dayjs, Dayjs] | null => {
    const [from, to] = period;
    if (!from || !to) return null;
    const diffDays = to.diff(from, "day") + 1;
    if (from.date() === 1 && from.month() === 0 && to.month() === 11 && to.date() === 31)
        return [from.subtract(1, "year"), to.subtract(1, "year")];
    if (from.date() === 1 && to.isSame(to.endOf("month"), "day"))
        return [from.subtract(1, "month").startOf("month"), from.subtract(1, "month").endOf("month")];
    return [from.subtract(diffDays, "day"), to.subtract(diffDays, "day")];
};

const wrap: React.CSSProperties = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 16,
};

const RangeBadge: React.FC<{ period: [Dayjs | null, Dayjs | null]; color: string; label: string }> = ({ period, color, label }) => {
    const [f, t] = period;
    if (!f || !t) return null;
    return <Tag color={color} style={{ borderRadius: 20, fontSize: 11, padding: "1px 10px" }}>{label}: {f.format("DD MMM YY")} {String.fromCharCode(8211)} {t.format("DD MMM YY")}</Tag>;
};

const DateBadge: React.FC<{ value: Dayjs | null; color: string; label: string }> = ({ value, color, label }) => {
    if (!value) return null;
    return <Tag color={color} style={{ borderRadius: 20, fontSize: 11, padding: "1px 10px" }}>{label}: {value.format("DD MMM YYYY")}</Tag>;
};

const ShiftChips: React.FC<{ onShift: (unit: "year" | "month" | "quarter") => void }> = ({ onShift }) => (
    <Space size={4} wrap>
        {(["Prev Year", "Prev Month", "Prev Quarter"] as const).map((label) => {
            const unit = label === "Prev Year" ? "year" : label === "Prev Month" ? "month" : "quarter";
            return (
                <Tag key={label} style={{ cursor: "pointer", borderRadius: 20, fontSize: 11, userSelect: "none" }}
                    onClick={() => onShift(unit)}>{label}</Tag>
            );
        })}
    </Space>
);

const MONTH_CHIPS = [1, 2, 3, 6, 12];

const MonthChips: React.FC<{
    activeMonths: number | null;
    onSelect: (months: number) => void;
    customMonths: number;
    onCustom: (months: number) => void;
}> = ({ activeMonths, onSelect, customMonths, onCustom }) => (
    <Space size={6} wrap align="center">
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>Quick:</Text>
        {MONTH_CHIPS.map((m) => (
            <Tag key={m} color={activeMonths === m ? "blue" : "default"}
                style={{ cursor: "pointer", borderRadius: 20, padding: "1px 10px", fontSize: 11, userSelect: "none" }}
                onClick={() => onSelect(m)}>
                {m}M
            </Tag>
        ))}
        <Space size={4} align="center">
            <InputNumber min={1} max={60} value={customMonths} size="small"
                style={{ width: 52, borderRadius: 6 }}
                onChange={(v) => v && onCustom(Number(v))} />
            <Text style={{ fontSize: 11, color: "#94a3b8" }}>M</Text>
        </Space>
    </Space>
);

// PeriodFilter
interface PeriodFilterProps {
    value: ComparativePeriod;
    onChange: (v: ComparativePeriod) => void;
    onRun: () => void;
    loading?: boolean;
    supportComparative?: boolean;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
    value, onChange, onRun, loading, supportComparative = true,
}) => {
    const [activeMonths, setActiveMonths] = useState<number | null>(null);
    const [customMonths, setCustomMonths] = useState(3);
    const antPresets = PERIOD_PRESETS.map(p => ({ label: p.label, value: p.value() }));

    const applyMonths = (months: number) => {
        const from = dayjs().subtract(months, "month").startOf("month");
        const to = dayjs().endOf("month");
        const range: [Dayjs, Dayjs] = [from, to];
        setActiveMonths(months);
        const next: ComparativePeriod = { ...value, primary: range };
        if (value.enabled) {
            const s = suggestComparePeriod(range);
            if (s) next.compare = s;
        }
        onChange(next);
    };

    const handlePrimaryChange = (range: [Dayjs | null, Dayjs | null]) => {
        setActiveMonths(null);
        const next = { ...value, primary: range };
        if (value.enabled) {
            const s = suggestComparePeriod(range);
            if (s) next.compare = s;
        }
        onChange(next);
    };

    const handleToggle = (checked: boolean) => {
        const next = { ...value, enabled: checked };
        if (checked && (!value.compare[0] || !value.compare[1])) {
            const s = suggestComparePeriod(value.primary);
            if (s) next.compare = s;
        }
        onChange(next);
    };

    const shift = (unit: "year" | "month" | "quarter") => {
        const [f, t] = value.primary;
        if (f && t) onChange({ ...value, compare: [f.subtract(1, unit), t.subtract(1, unit)] });
    };

    return (
        <div style={wrap}>
            <Space wrap align="center" size={8}>
                <FilterOutlined style={{ color: "#8c8c8c" }} />
                <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>Period:</Text>
                <RangePicker value={value.primary} onChange={(r) => handlePrimaryChange(r as [Dayjs | null, Dayjs | null])}
                    allowClear={false} format="DD MMM YYYY" presets={antPresets} style={{ borderRadius: 8 }} />
                <MonthChips activeMonths={activeMonths} onSelect={(m) => applyMonths(m)}
                    customMonths={customMonths} onCustom={(m) => { setCustomMonths(m); applyMonths(m); }} />
                <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={onRun} style={{ borderRadius: 8 }}>
                    Run Report
                </Button>
            </Space>
            {supportComparative && (
                <>
                    <Divider style={{ margin: "10px 0" }} />
                    <Space wrap align="center" size={8}>
                        <SwapOutlined style={{ color: value.enabled ? "#6c1c2c" : "#8c8c8c" }} />
                        <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Compare with:</Text>
                        <Switch size="small" checked={value.enabled} onChange={handleToggle} checkedChildren="ON" unCheckedChildren="OFF" />
                        {value.enabled && (
                            <>
                                <RangePicker value={value.compare}
                                    onChange={(r) => onChange({ ...value, compare: r as [Dayjs | null, Dayjs | null] })}
                                    allowClear={false} format="DD MMM YYYY" presets={antPresets} style={{ borderRadius: 8 }} />
                                <ShiftChips onShift={shift} />
                            </>
                        )}
                    </Space>
                    {value.enabled && value.primary[0] && value.compare[0] && (
                        <Space style={{ marginTop: 8 }} size={6}>
                            <RangeBadge period={value.primary} color="blue" label="Current" />
                            <RangeBadge period={value.compare} color="purple" label="Compare" />
                        </Space>
                    )}
                </>
            )}
        </div>
    );
};

// AsOfFilter
interface AsOfFilterProps {
    value: ComparativeAsOf;
    onChange: (v: ComparativeAsOf) => void;
    onRun: () => void;
    loading?: boolean;
    supportComparative?: boolean;
}

export const AsOfFilter: React.FC<AsOfFilterProps> = ({
    value, onChange, onRun, loading, supportComparative = true,
}) => {
    const asOfPresets = [
        { label: "Today", value: dayjs() },
        { label: "End of Last Month", value: dayjs().subtract(1, "month").endOf("month") },
        { label: "End of Last Quarter", value: dayjs().subtract(1, "quarter").endOf("quarter") },
        { label: "End of Last Year", value: dayjs().subtract(1, "year").endOf("year") },
    ];

    const handleToggle = (checked: boolean) => {
        const next = { ...value, enabled: checked };
        if (checked && !value.compare && value.primary)
            next.compare = value.primary.subtract(1, "year");
        onChange(next);
    };

    const shiftCompare = (unit: "year" | "month" | "quarter") => {
        if (value.primary) onChange({ ...value, compare: value.primary.subtract(1, unit) });
    };

    return (
        <div style={wrap}>
            <Space wrap align="center" size={8}>
                <FilterOutlined style={{ color: "#8c8c8c" }} />
                <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>As of:</Text>
                <DatePicker value={value.primary} onChange={(d) => onChange({ ...value, primary: d })}
                    format="DD MMM YYYY" allowClear={false} presets={asOfPresets} style={{ borderRadius: 8 }} />
                <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={onRun} style={{ borderRadius: 8 }}>
                    Run Report
                </Button>
            </Space>
            {supportComparative && (
                <>
                    <Divider style={{ margin: "10px 0" }} />
                    <Space wrap align="center" size={8}>
                        <SwapOutlined style={{ color: value.enabled ? "#6c1c2c" : "#8c8c8c" }} />
                        <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Compare with:</Text>
                        <Switch size="small" checked={value.enabled} onChange={handleToggle} checkedChildren="ON" unCheckedChildren="OFF" />
                        {value.enabled && (
                            <>
                                <DatePicker value={value.compare} onChange={(d) => onChange({ ...value, compare: d })}
                                    format="DD MMM YYYY" allowClear={false} presets={asOfPresets} style={{ borderRadius: 8 }} />
                                <ShiftChips onShift={shiftCompare} />
                            </>
                        )}
                    </Space>
                    {value.enabled && value.primary && value.compare && (
                        <Space style={{ marginTop: 8 }} size={6}>
                            <DateBadge value={value.primary} color="blue" label="Current" />
                            <DateBadge value={value.compare} color="purple" label="Compare" />
                        </Space>
                    )}
                </>
            )}
        </div>
    );
};

// GLPeriodFilter - NO comparison, has RangePicker + month chips + custom input
interface GLPeriodFilterProps {
    value: GLPeriodValue;
    onChange: (v: GLPeriodValue) => void;
    onRun: () => void;
    loading?: boolean;
}

export const GLPeriodFilter: React.FC<GLPeriodFilterProps> = ({ value, onChange, onRun, loading }) => {
    const [activeMonths, setActiveMonths] = useState<number>(3);
    const [customMonths, setCustomMonths] = useState<number>(4);

    const glPresets = PERIOD_PRESETS.map(p => ({ label: p.label, value: p.value() }));

    const applyMonths = (months: number) => {
        setActiveMonths(months);
        onChange({
            from: dayjs().subtract(months, "month").startOf("month").toISOString(),
            to: dayjs().endOf("month").toISOString(),
            label: "Last " + months + " Months",
        });
    };

    const handleThisYear = () => {
        setActiveMonths(-1);
        onChange({
            from: dayjs().startOf("year").toISOString(),
            to: dayjs().endOf("year").toISOString(),
            label: "This Year",
        });
    };

    const handleRangeChange = (range: [Dayjs | null, Dayjs | null]) => {
        if (!range[0] || !range[1]) return;
        setActiveMonths(0);
        onChange({
            from: range[0].startOf("day").toISOString(),
            to: range[1].endOf("day").toISOString(),
            label: range[0].format("DD MMM YY") + " to " + range[1].format("DD MMM YY"),
        });
    };

    return (
        <div style={wrap}>
            <Space wrap align="center" size={8}>
                <FilterOutlined style={{ color: "#8c8c8c" }} />
                <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>Period:</Text>
                <RangePicker
                    value={[dayjs(value.from), dayjs(value.to)]}
                    onChange={(r) => handleRangeChange(r as [Dayjs | null, Dayjs | null])}
                    allowClear={false} format="DD MMM YYYY" presets={glPresets}
                    style={{ borderRadius: 8 }}
                />
                {MONTH_CHIPS.map((m) => (
                    <Tag key={m} color={activeMonths === m ? "blue" : "default"}
                        style={{ cursor: "pointer", borderRadius: 20, padding: "2px 10px", fontSize: 11, userSelect: "none" }}
                        onClick={() => applyMonths(m)}>
                        {m}M
                    </Tag>
                ))}
                <Tag color={activeMonths === -1 ? "blue" : "default"}
                    style={{ cursor: "pointer", borderRadius: 20, padding: "2px 10px", fontSize: 11, userSelect: "none" }}
                    onClick={handleThisYear}>
                    This Year
                </Tag>
                <Space size={4} align="center">
                    <Text style={{ fontSize: 11, color: "#94a3b8" }}>Last:</Text>
                    <InputNumber min={1} max={60} value={customMonths} size="small"
                        style={{ width: 52, borderRadius: 6 }}
                        onChange={(v) => { if (!v) return; setCustomMonths(Number(v)); applyMonths(Number(v)); }} />
                    <Text style={{ fontSize: 11, color: "#94a3b8" }}>M</Text>
                </Space>
                <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={onRun} style={{ borderRadius: 8 }}>
                    Run Report
                </Button>
            </Space>
            <div style={{ marginTop: 8 }}>
                <Tag style={{ borderRadius: 20, padding: "2px 12px", fontSize: 11, background: "#f0f5ff", borderColor: "#adc6ff", color: "#2f54eb" }}>
                    {value.label}: {dayjs(value.from).format("DD MMM YY")} to {dayjs(value.to).format("DD MMM YY")}
                </Tag>
            </div>
        </div>
    );
};

// Export button
interface ExportButtonProps {
    onExportCSV?: () => void;
    onExportPDF?: () => void;
    disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExportCSV, onExportPDF, disabled }) => {
    const items = [];
    if (onExportCSV) {
        items.push({ key: 'csv', label: 'Export to CSV' });
    }
    if (onExportPDF) {
        items.push({ key: 'pdf', label: 'Export to PDF' });
    }

    if (items.length === 0) return null;

    const handleMenuClick = ({ key }: { key: string }) => {
        if (key === 'csv' && onExportCSV) onExportCSV();
        if (key === 'pdf' && onExportPDF) onExportPDF();
    };

    return (
        <Dropdown menu={{ items, onClick: handleMenuClick }} disabled={disabled}>
            <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Export</Button>
        </Dropdown>
    );
};

export const exportToCSV = (filename: string, rows: Record<string, any>[], periodLabel?: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
        periodLabel ? `Report Period: ${periodLabel}` : "",
        headers.join(","),
        ...rows.map((row) =>
            headers.map((h) => {
                const val = row[h] ?? "";
                const str = String(val).replace(/"/g, '""');
                return str.includes(",") || str.includes('"') ? '"' + str + '"' : str;
            }).join(",")
        ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename + "_" + dayjs().format("YYYY-MM-DD") + ".csv";
    link.click();
    URL.revokeObjectURL(url);
};

export const exportToPDF = (filename: string, rows: Record<string, any>[], periodLabel?: string, summary?: { revenue?: number; expenses?: number; netProfit?: number; basis?: string; assets?: number; liabilities?: number; equity?: number; asOf?: string }) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${filename}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 10px; color: #1a1a1a; }
        .period { font-size: 14px; color: #666; margin-bottom: 20px; font-weight: 500; }
        .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .summary-row:last-child { margin-bottom: 0; }
        .summary-label { font-weight: 500; color: #64748b; }
        .summary-value { font-weight: 600; color: #0f172a; }
        .summary-value.profit { color: #10b981; }
        .summary-value.loss { color: #ef4444; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f5f5f5; text-align: left; padding: 8px 12px; border-bottom: 2px solid #ddd; font-size: 11px; font-weight: 600; color: #444; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 30px; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <h1>${filename.replace(/_/g, ' ').toUpperCase()}</h1>
    ${periodLabel ? `<div class="period">Report Period: ${periodLabel}</div>` : ''}
    ${summary ? `
    <div class="summary">
        ${periodLabel ? `<div class="summary-row"><span class="summary-label">Report Period:</span><span class="summary-value">${periodLabel}</span></div>` : ''}
        ${summary.basis ? `<div class="summary-row"><span class="summary-label">Basis:</span><span class="summary-value">${summary.basis}</span></div>` : ''}
        ${summary.asOf ? `<div class="summary-row"><span class="summary-label">As Of:</span><span class="summary-value">${summary.asOf}</span></div>` : ''}
        ${summary.revenue !== undefined ? `<div class="summary-row"><span class="summary-label">Revenue:</span><span class="summary-value">KES ${(summary.revenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
        ${summary.expenses !== undefined ? `<div class="summary-row"><span class="summary-label">Expenses:</span><span class="summary-value">KES ${(summary.expenses || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
        ${summary.netProfit !== undefined ? `<div class="summary-row"><span class="summary-label">Net Profit:</span><span class="summary-value ${summary.netProfit >= 0 ? 'profit' : 'loss'}">KES ${(summary.netProfit || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
        ${summary.assets !== undefined ? `<div class="summary-row"><span class="summary-label">Total Assets:</span><span class="summary-value">KES ${(summary.assets || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
        ${summary.liabilities !== undefined ? `<div class="summary-row"><span class="summary-label">Total Liabilities:</span><span class="summary-value">KES ${(summary.liabilities || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
        ${summary.equity !== undefined ? `<div class="summary-row"><span class="summary-label">Total Equity:</span><span class="summary-value">KES ${(summary.equity || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
        <div class="summary-row"><span class="summary-label">Generated:</span><span class="summary-value">${dayjs().format('DD MMM YYYY HH:mm')}</span></div>
    </div>
    ` : ''}
    <table>
        <thead>
            <tr>
                ${headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${rows.map(row => `
                <tr>
                    ${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>
    ${!summary ? `<div class="footer">Generated on ${dayjs().format('DD MMM YYYY HH:mm')}</div>` : ''}
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }
};