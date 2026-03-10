import { useMemo } from "react";
import { Button, Rate, Table, Typography } from "antd";
import { FileExcelOutlined, FilePdfOutlined, StarFilled } from "@ant-design/icons";
import { utils as XLSXUtils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Rating badge ───────────────────────────────────────────────────────────
const RatingBadge = ({ rating }: { rating: number }) => {
  const color =
    rating >= 4 ? C.green :
      rating >= 3 ? C.orange : C.red;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Rate
        disabled value={rating} count={5}
        character={<StarFilled />}
        style={{ fontSize: 11, color }}
      />
      <Text style={{ fontSize: 11, color, fontWeight: 600 }}>{rating}/5</Text>
    </div>
  );
};

// ── Component ──────────────────────────────────────────────────────────────
interface Visit {
  _id?: string;
  createdAt: string;
  rating?: number;
  review?: string;
}
interface ExportableVisitsTableProps {
  record: {
    created_by?: { username?: string };
    visits: Visit[];
  };
}

const ExportableVisitsTable = ({ record }: ExportableVisitsTableProps) => {
  const { created_by, visits } = record;

  const fmtDate = (dateString: string) => {
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
      time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const tableData = useMemo(() => (
    visits.map((visit, i) => {
      const { date, time } = fmtDate(visit.createdAt);
      return {
        key: visit._id || i,
        date,
        time,
        rating: visit.rating || 0,
        review: visit.review || "",
        createdBy: created_by?.username,
        rawDate: visit.createdAt,
      };
    })
  ), [visits, created_by]);

  // ── Export handlers ──────────────────────────────────────────────────────
  const exportToExcel = () => {
    const rows = tableData.map(({ date, time, rating, review, createdBy }) => ({
      "Visit Date": date,
      "Visit Time": time,
      "Rating": `${rating}/5`,
      "Review": review,
      "Created By": createdBy || "",
    }));
    const ws = XLSXUtils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 55 }, { wch: 18 }];
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, "Visits");
    writeFile(wb, "customer_visits.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Customer Visit History", 14, 15);
    doc.setFontSize(10);
    doc.text(`Created By: ${created_by?.username || "—"}`, 14, 25);
    doc.text(`Export Date: ${new Date().toLocaleDateString("en-GB")}`, 14, 31);

    autoTable(doc, {
      head: [["Visit Date", "Visit Time", "Rating", "Review", "Created By"]],
      body: tableData.map(r => [r.date, r.time, `${r.rating}/5`, r.review, created_by?.username || "—"]),
      startY: 38,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [108, 28, 44] },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 20 },
        2: { cellWidth: 16 },
        3: { cellWidth: 80, overflow: "linebreak" },
        4: { cellWidth: 26 },
      },
    });

    doc.save("customer_visits.pdf");
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Visit Date", dataIndex: "date", key: "date", width: 180,
      sorter: (a: any, b: any) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime(),
      render: (text: string) => <Text style={{ fontSize: 12 }}>{text}</Text>,
    },
    {
      title: "Time", dataIndex: "time", key: "time", width: 90,
      render: (text: string) => <Text style={{ fontSize: 12, color: C.subText }}>{text}</Text>,
    },
    {
      title: "Rating", dataIndex: "rating", key: "rating", width: 190,
      sorter: (a: any, b: any) => a.rating - b.rating,
      render: (rating: number) => <RatingBadge rating={rating} />,
    },
    {
      title: "Review", dataIndex: "review", key: "review", ellipsis: { showTitle: true },
      render: (review: string) =>
        review
          ? <Text style={{ fontSize: 12 }}>{review}</Text>
          : <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>No review</Text>,
    },
  ];

  const avgRating = tableData.length
    ? (tableData.reduce((s, r) => s + r.rating, 0) / tableData.length).toFixed(1)
    : "—";

  return (
    <div style={{ padding: "4px 0" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 10, marginBottom: 14,
      }}>
        <div>
          <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
            Visit History
          </Text>
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: C.subText }}>
              {tableData.length} visit{tableData.length !== 1 ? "s" : ""}
            </Text>
            {tableData.length > 0 && (
              <Text style={{ fontSize: 11, color: C.orange }}>
                ★ Avg {avgRating}
              </Text>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" icon={<FileExcelOutlined />} onClick={exportToExcel}
            style={{ borderRadius: 7, fontSize: 12, color: C.green, borderColor: C.green }}>
            Excel
          </Button>
          <Button size="small" icon={<FilePdfOutlined />} onClick={exportToPDF}
            style={{ borderRadius: 7, fontSize: 12, color: C.red, borderColor: C.red }}>
            PDF
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={tableData}
        size="small"
        pagination={{
          pageSize: 5, showSizeChanger: true,
          showTotal: (total) => `${total} visit${total !== 1 ? "s" : ""}`,
        }}
        scroll={{ x: 560 }}
        locale={{ emptyText: "No visits recorded" }}
      />
    </div>
  );
};

export default ExportableVisitsTable;