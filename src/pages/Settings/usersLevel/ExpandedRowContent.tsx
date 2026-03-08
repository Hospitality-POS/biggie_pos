import React from "react";
import { Button, Dropdown, Space, Typography } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  LoginOutlined,
  LogoutOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClockRecord {
  _id: string;
  clock_in: string;
  clock_out?: string;
}

interface Shop {
  _id: string;
  name: string;
  location: string;
}

interface EmployeeRecord {
  pin: string;
  username: string;
  createdAt: string;
  phone: string;
  clockInArray: ClockRecord[];
  email: string;
  shop_id: Shop;
}

interface ExpandedRowContentProps {
  record: EmployeeRecord;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTimeDisplay = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("en-US", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    fullDate: date,
  };
};

const calculateDuration = (clockIn: Date, clockOut?: Date): string => {
  if (!clockOut) return "In Progress";
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{
    fontSize: 10, fontWeight: 700, color: C.subText,
    textTransform: "uppercase", letterSpacing: "0.5px",
    display: "block", marginBottom: 10,
  }}>
    {children}
  </Text>
);

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div style={{
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "7px 0",
    borderBottom: `1px solid ${C.border}`,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ color: C.subText, fontSize: 13 }}>{icon}</span>
      <Text style={{ fontSize: 12, color: C.subText }}>{label}</Text>
    </div>
    <Text style={{ fontSize: 12, color: C.darkText, fontWeight: 500 }}>{value}</Text>
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span style={{
    background: active ? "#fffbeb" : "#f0fdf4",
    color: active ? C.orange : C.green,
    borderRadius: 6, fontSize: 10, fontWeight: 700,
    padding: "2px 8px", textTransform: "uppercase", whiteSpace: "nowrap",
  }}>
    {active ? "Active" : "Completed"}
  </span>
);

// ── Main component ────────────────────────────────────────────────────────────
const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({ record }) => {
  const { pin, username, createdAt, phone, clockInArray, email, shop_id } = record;
  const formattedCreatedAt = new Date(createdAt).toLocaleString();

  // ── Stats ───────────────────────────────────────────────────────────────
  const totalShifts = clockInArray.length;
  const completedShifts = clockInArray.filter((r) => r.clock_out).length;
  const activeShifts = totalShifts - completedShifts;

  // ── Export to Excel ─────────────────────────────────────────────────────
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    XLSX.utils.sheet_add_aoa(ws, [
      ["TIMESHEET REPORT"],
      [`Generated on: ${new Date().toLocaleString()}`],
      [""],
    ], { origin: "A1" });

    XLSX.utils.sheet_add_aoa(ws, [
      ["EMPLOYEE INFORMATION"],
      ["Name:", username],
      ["Email:", email],
      ["Phone:", phone],
      ["Shop:", `${shop_id?.name} - ${shop_id?.location}`],
      ["Account Created:", formattedCreatedAt],
      [""],
    ], { origin: "A5" });

    XLSX.utils.sheet_add_aoa(ws, [
      ["ATTENDANCE RECORDS"],
      [""],
      ["Date", "Day", "Clock In", "Clock Out", "Duration", "Status"],
    ], { origin: "A12" });

    const rowData = clockInArray.map((r) => {
      const ci = formatTimeDisplay(r.clock_in);
      const co = r.clock_out ? formatTimeDisplay(r.clock_out) : null;
      return [
        ci.fullDate.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
        ci.fullDate.toLocaleDateString("en-US", { weekday: "long" }),
        ci.time,
        co ? co.time : "Active",
        calculateDuration(ci.fullDate, co?.fullDate),
        r.clock_out ? "Completed" : "In Progress",
      ];
    });

    XLSX.utils.sheet_add_aoa(ws, rowData, { origin: "A15" });

    const lastRow = 15 + rowData.length + 1;
    XLSX.utils.sheet_add_aoa(ws, [
      [""],
      ["SUMMARY"],
      ["Total Records:", totalShifts],
      ["Completed Shifts:", completedShifts],
      ["Active Shifts:", activeShifts],
    ], { origin: `A${lastRow}` });

    ws["!cols"] = [
      { wch: 12 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    XLSX.writeFile(wb, `${username}_timesheet.xlsx`);
  };

  // ── Export to PDF ───────────────────────────────────────────────────────
  const exportToPDF = () => {
    const doc = new jsPDF();
    const primary = [108, 28, 44] as [number, number, number];

    doc.setTextColor(...primary);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("TIMESHEET REPORT", 14, 18);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.text("Powered by ReliaTech", doc.internal.pageSize.width - 14, 26, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 30, 196, 30);

    doc.setFontSize(11);
    doc.setTextColor(...primary);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE INFORMATION", 14, 38);

    const empFields: [string, string][] = [
      ["Name:", username],
      ["Shop:", shop_id?.name || "—"],
      ["Email:", email],
      ["Phone:", phone],
      ["PIN:", pin],
      ["Account Created:", formattedCreatedAt],
    ];

    doc.setFontSize(10);
    empFields.forEach(([label, val], i) => {
      const y = 46 + i * 7;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(label, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(val, 55, y);
    });

    const tableStartY = 46 + empFields.length * 7 + 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, tableStartY - 4, 196, tableStartY - 4);

    doc.setFontSize(11);
    doc.setTextColor(...primary);
    doc.setFont("helvetica", "bold");
    doc.text("ATTENDANCE RECORDS", 14, tableStartY + 4);

    const tableData = clockInArray.map((r) => {
      const ci = formatTimeDisplay(r.clock_in);
      const co = r.clock_out ? formatTimeDisplay(r.clock_out) : null;
      return [
        ci.fullDate.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
        ci.fullDate.toLocaleDateString("en-US", { weekday: "long" }),
        ci.time,
        co ? co.time : "Active",
        calculateDuration(ci.fullDate, co?.fullDate),
        r.clock_out ? "Completed" : "In Progress",
      ];
    });

    // @ts-ignore
    doc.autoTable({
      startY: tableStartY + 10,
      head: [["Date", "Day", "Clock In", "Clock Out", "Duration", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { cellPadding: 3, fontSize: 9, lineColor: [226, 232, 240], lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 24 }, 1: { cellWidth: 28 }, 2: { cellWidth: 22 },
        3: { cellWidth: 22 }, 4: { cellWidth: 22 }, 5: { cellWidth: 28 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setTextColor(...primary);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY", 14, finalY);

    const summaryRows: [string, string][] = [
      ["Total Records:", String(totalShifts)],
      ["Completed Shifts:", String(completedShifts)],
      ["Active Shifts:", String(activeShifts)],
    ];

    summaryRows.forEach(([label, val], i) => {
      const y = finalY + 8 + i * 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(label, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(val, 55, y);
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footerY = doc.internal.pageSize.height - 10;
      doc.text(`Page ${i} of ${pageCount}`, 14, footerY);
      doc.text("Confidential — Internal use only", doc.internal.pageSize.width / 2, footerY, { align: "center" });
      doc.text(`${username} — Timesheet Report`, doc.internal.pageSize.width - 14, footerY, { align: "right" });
    }

    doc.save(`${username}_timesheet.pdf`);
  };

  return (
    <div style={{ padding: "16px 20px" }}>

      {/* ── Employee info + stats grid ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>

        {/* Info card */}
        <div style={{
          flex: "1 1 260px",
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "14px 16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              background: C.primaryLight, borderRadius: 7,
              padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
            }}>
              <UserOutlined />
            </div>
            <Text strong style={{ fontSize: 12, color: C.darkText }}>Employee Details</Text>
          </div>
          <InfoRow icon={<UserOutlined />} label="Username" value={username} />
          <InfoRow icon={<SafetyCertificateOutlined />} label="PIN" value={pin} />
          <InfoRow icon={<PhoneOutlined />} label="Phone" value={phone} />
          <InfoRow icon={<MailOutlined />} label="Email" value={email} />
          <InfoRow icon={<ShopOutlined />} label="Shop" value={shop_id?.name || "—"} />
          <InfoRow icon={<CalendarOutlined />} label="Created" value={formattedCreatedAt} />
        </div>

        {/* Stats card */}
        <div style={{
          flex: "1 1 200px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {[
            { label: "Total Shifts", value: totalShifts, color: C.blue, bg: "#eff6ff" },
            { label: "Completed", value: completedShifts, color: C.green, bg: "#f0fdf4" },
            { label: "Active / Ongoing", value: activeShifts, color: C.orange, bg: "#fffbeb" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              background: bg, border: `1px solid ${color}20`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
              <Text strong style={{ fontSize: 18, color, lineHeight: 1 }}>{value}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* ── Clock history ──────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 10, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
          padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
          background: C.bg,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{
              background: C.primaryLight, borderRadius: 7,
              padding: "4px 6px", color: C.primary, fontSize: 13, lineHeight: 1, flexShrink: 0,
            }}>
              <ClockCircleOutlined />
            </div>
            <Text strong style={{ fontSize: 13, color: C.darkText, whiteSpace: "nowrap" }}>
              Clock In / Out History
            </Text>
            <span style={{
              background: C.primaryLight, color: C.primary,
              borderRadius: 10, fontSize: 10, fontWeight: 700,
              padding: "1px 7px", flexShrink: 0,
            }}>
              {totalShifts}
            </span>
          </div>

          {clockInArray.length > 0 && (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "excel",
                    icon: <FileExcelOutlined style={{ color: C.green }} />,
                    label: <span style={{ fontSize: 12 }}>Export to Excel</span>,
                    onClick: exportToExcel,
                  },
                  {
                    key: "pdf",
                    icon: <FilePdfOutlined style={{ color: C.red }} />,
                    label: <span style={{ fontSize: 12 }}>Export to PDF</span>,
                    onClick: exportToPDF,
                  },
                ],
              }}
            >
              <Button
                size="small"
                icon={<DownloadOutlined />}
                style={{ borderRadius: 7, borderColor: C.border, fontSize: 12, color: C.darkText }}
              >
                Export
              </Button>
            </Dropdown>
          )}
        </div>

        {/* List */}
        {clockInArray.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <ClockCircleOutlined style={{ fontSize: 28, color: C.border, display: "block", marginBottom: 8 }} />
            <Text style={{ fontSize: 12, color: C.subText }}>No clock records found</Text>
          </div>
        ) : (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {clockInArray.map((rec: ClockRecord) => {
              const ci = formatTimeDisplay(rec.clock_in);
              const co = rec.clock_out ? formatTimeDisplay(rec.clock_out) : null;
              const duration = calculateDuration(ci.fullDate, co?.fullDate);
              const isActive = !rec.clock_out;

              return (
                <div key={rec._id} style={{
                  background: isActive ? "#fffbeb" : C.bg,
                  border: `1px solid ${isActive ? C.orange + "40" : C.border}`,
                  borderLeft: `3px solid ${isActive ? C.orange : C.green}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                }}>
                  {/* Date row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <CalendarOutlined style={{ color: C.blue, fontSize: 12, flexShrink: 0 }} />
                      <Text strong style={{ fontSize: 12, color: C.darkText }}>{ci.date}</Text>
                    </div>
                    <StatusBadge active={isActive} />
                  </div>

                  {/* Times row */}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <LoginOutlined style={{ color: C.green, fontSize: 12 }} />
                      <Text style={{ fontSize: 11, color: C.subText }}>In:</Text>
                      <Text strong style={{ fontSize: 12, color: C.darkText }}>{ci.time}</Text>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isActive ? (
                        <>
                          <ClockCircleOutlined style={{ color: C.orange, fontSize: 12 }} />
                          <Text style={{ fontSize: 11, color: C.subText }}>Out:</Text>
                          <Text style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Still Active</Text>
                        </>
                      ) : (
                        <>
                          <LogoutOutlined style={{ color: C.red, fontSize: 12 }} />
                          <Text style={{ fontSize: 11, color: C.subText }}>Out:</Text>
                          <Text strong style={{ fontSize: 12, color: C.darkText }}>{co!.time}</Text>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <ClockCircleOutlined style={{ color: C.subText, fontSize: 11 }} />
                    <Text style={{ fontSize: 11, color: C.subText }}>{duration}</Text>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedRowContent;