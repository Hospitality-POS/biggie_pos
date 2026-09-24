import React, { useMemo } from "react";
import { Modal, Table, Typography, Empty, Spin, Button, Space, Tag } from "antd";
import {
  ClockCircleOutlined,
  TeamOutlined,
  FieldTimeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { exportToExcel, exportToPDF } from "@utils/exportUtils";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = THEME_C;

const fmtHours = (v: number) => (Number(v) || 0).toFixed(2);

export interface StaffHoursReportRow {
  staff_id: string;
  fullname?: string;
  username?: string;
  total_hours: number;
  completed_sessions: number;
  open_sessions: number;
  first_clock_in?: string;
  last_activity?: string;
}

interface StaffHoursReportModalProps {
  open: boolean;
  onClose: () => void;
  data: StaffHoursReportRow[];
  totals?: { employees: number; total_hours: number; completed_sessions: number; open_sessions: number };
  loading: boolean;
  startDate: string;
  endDate: string;
}

// ── Summary card ──────────────────────────────────────────────────────────────
const SummaryCard: React.FC<{ label: string; value: string; color: string; bg: string; icon: React.ReactNode }> = ({ label, value, color, bg, icon }) => (
  <div style={{ flex: "1 1 150px", background: bg, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "10px 14px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ color, fontSize: 12 }}>{icon}</span>
      <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 700 }}>{label}</Text>
    </div>
    <Text strong style={{ fontSize: 14, color }}>{value}</Text>
  </div>
);

const StaffHoursReportModal: React.FC<StaffHoursReportModalProps> = ({
  open, onClose, data, totals, loading, startDate, endDate,
}) => {
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const hasData = rows.length > 0;

  const computedTotals = useMemo(() => totals ?? {
    employees: rows.length,
    total_hours: rows.reduce((s, r) => s + (r.total_hours || 0), 0),
    completed_sessions: rows.reduce((s, r) => s + (r.completed_sessions || 0), 0),
    open_sessions: rows.reduce((s, r) => s + (r.open_sessions || 0), 0),
  }, [totals, rows]);

  const avgHours = computedTotals.employees > 0 ? computedTotals.total_hours / computedTotals.employees : 0;

  const columns = [
    {
      title: "Employee", dataIndex: "fullname", key: "fullname",
      render: (v: string, r: StaffHoursReportRow) => v || r.username || "Unknown",
    },
    {
      title: "Total Hours Worked", dataIndex: "total_hours", key: "total_hours", align: "right" as const,
      render: (v: number) => <Text strong style={{ color: C.primary }}>{fmtHours(v)}</Text>,
      sorter: (a: StaffHoursReportRow, b: StaffHoursReportRow) => a.total_hours - b.total_hours,
      defaultSortOrder: "descend" as const,
    },
    { title: "Completed Sessions", dataIndex: "completed_sessions", key: "completed_sessions", align: "right" as const },
    {
      title: "Open Sessions", dataIndex: "open_sessions", key: "open_sessions", align: "right" as const,
      render: (v: number) => v > 0 ? <Tag color="orange">{v} still clocked in</Tag> : "—",
    },
    {
      title: "First Clock In", dataIndex: "first_clock_in", key: "first_clock_in",
      render: (v: string) => v ? dayjs(v).format("DD MMM YYYY HH:mm") : "—",
    },
    {
      title: "Last Activity", dataIndex: "last_activity", key: "last_activity",
      render: (v: string) => v ? dayjs(v).format("DD MMM YYYY HH:mm") : "—",
    },
  ];

  const exportRows = () => rows.map((r) => ({
    "Employee": r.fullname || r.username || "Unknown",
    "Total Hours Worked": fmtHours(r.total_hours),
    "Completed Sessions": r.completed_sessions,
    "Open Sessions": r.open_sessions,
    "First Clock In": r.first_clock_in ? dayjs(r.first_clock_in).format("DD MMM YYYY HH:mm") : "",
    "Last Activity": r.last_activity ? dayjs(r.last_activity).format("DD MMM YYYY HH:mm") : "",
  }));

  const handleExportExcel = () => exportToExcel(exportRows(), `staff-hours-worked-${dayjs().format("YYYY-MM-DD")}`);

  const handleExportPDF = () => exportToPDF(
    exportRows(),
    `staff-hours-worked-${dayjs().format("YYYY-MM-DD")}`,
    undefined,
    {
      title: "Staff Hours Worked Report",
      subtitle: `${dayjs(startDate).format("DD MMM YYYY")} – ${dayjs(endDate).format("DD MMM YYYY")}`,
      columns: [
        { header: "Employee", dataKey: "Employee" },
        { header: "Total Hours Worked", dataKey: "Total Hours Worked" },
        { header: "Completed Sessions", dataKey: "Completed Sessions" },
        { header: "Open Sessions", dataKey: "Open Sessions" },
        { header: "First Clock In", dataKey: "First Clock In" },
        { header: "Last Activity", dataKey: "Last Activity" },
      ],
    }
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnClose
      width={1000}
      style={{ top: 20 }}
      styles={{ body: { padding: "16px 20px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
            <ClockCircleOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Staff Hours Worked Report</Text>
        </div>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} disabled={!hasData}>Export Excel</Button>
            <Button icon={<FilePdfOutlined />} onClick={handleExportPDF} disabled={!hasData}>Export PDF</Button>
          </Space>
          <Button type="primary" onClick={onClose} style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}>
            Close
          </Button>
        </div>
      }
    >
      <Spin spinning={loading} tip="Generating hours worked report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !loading ? (
          <Empty description="No clock in/out records found for the selected period" style={{ padding: "40px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <SummaryCard label="Employees" value={`${computedTotals.employees}`} color={C.blue} bg="#eff6ff" icon={<TeamOutlined />} />
              <SummaryCard label="Total Hours Worked" value={fmtHours(computedTotals.total_hours)} color={C.primary} bg={C.primaryLight} icon={<FieldTimeOutlined />} />
              <SummaryCard label="Avg Hours / Employee" value={fmtHours(avgHours)} color={C.green} bg="#f0fdf4" icon={<ClockCircleOutlined />} />
              {computedTotals.open_sessions > 0 && (
                <SummaryCard label="Currently Clocked In" value={`${computedTotals.open_sessions}`} color={C.orange} bg="#fff7ed" icon={<ClockCircleOutlined />} />
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, flexWrap: "wrap" }}>
              <CalendarOutlined style={{ color: C.subText, fontSize: 11 }} />
              <Text style={{ fontSize: 12, color: C.subText, flex: 1 }}>
                {dayjs(startDate).format("MMM DD, YYYY")} → {dayjs(endDate).format("MMM DD, YYYY")}
              </Text>
            </div>

            <Table
              columns={columns as any}
              dataSource={rows}
              loading={loading}
              rowKey="staff_id"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total} employees` }}
              size="small"
              scroll={{ x: 900 }}
            />
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default StaffHoursReportModal;
