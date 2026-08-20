import React, { useMemo, useRef, useState } from "react";
import {
  Modal,
  Table,
  Typography,
  Empty,
  Spin,
  Button,
  Space,
  Select,
  Form,
  Input,
} from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  MailOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { sendSalesReportEmail, refToHtmlString } from "@services/emailReports";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  blue: "#3b82f6",
  orange: "#f59e0b",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const fmt = (v: number) =>
  (Number(v) || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface ProductTypeSalesItem {
  name: string;
  quantity: number;
  price: number;
  total_amount: number;
  supplier_price: number;
  category: string;
}

interface ProductTypeSalesModalProps {
  open: boolean;
  onClose: () => void;
  data: any;
  loading: boolean;
  startDate: string;
  endDate: string;
}

const ProductTypeSalesModal: React.FC<ProductTypeSalesModalProps> = ({
  open,
  onClose,
  data,
  loading,
  startDate,
  endDate,
}) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailForm] = Form.useForm();

  const result = data?.data || [];
  const summary = data?.summary || {};
  const type = data?.filters_applied?.type || "";

  const title =
    type === "services"
      ? "Services Sales Report"
      : type === "products"
      ? "Products Sales Report"
      : "Services / Products Sales Report";

  const items: ProductTypeSalesItem[] = useMemo(() => {
    return (result || []).flatMap((cat: any) =>
      (cat.orderItems || []).map((it: any) => ({
        name: it.name || "Unknown",
        quantity: Number(it.quantity || 0),
        price: Number(it.price || 0),
        total_amount: Number(it.total_amount || 0),
        supplier_price: Number(it.supplier_price || 0),
        category: cat.name || "Uncategorized",
      }))
    );
  }, [result]);

  const categories = useMemo(() => {
    const names = (result || []).map((cat: any) => cat.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [result]);

  const categoryOptions = useMemo(
    () =>
      categories.map((name) => ({
        label: name,
        value: name,
      })),
    [categories]
  );

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return items;
    return items.filter((i) => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const { totalAmount, totalCost, totalQty } = useMemo(() => {
    return filteredItems.reduce(
      (acc, i) => {
        acc.totalAmount += i.total_amount;
        acc.totalCost += i.supplier_price * i.quantity;
        acc.totalQty += i.quantity;
        return acc;
      },
      { totalAmount: 0, totalCost: 0, totalQty: 0 }
    );
  }, [filteredItems]);

  const categoryRowSpans = useMemo(() => {
    const spans: Record<number, number> = {};
    let i = 0;
    while (i < filteredItems.length) {
      const cat = filteredItems[i].category;
      let j = i + 1;
      while (j < filteredItems.length && filteredItems[j].category === cat) j++;
      spans[i] = j - i;
      for (let k = i + 1; k < j; k++) spans[k] = 0;
      i = j;
    }
    return spans;
  }, [filteredItems]);

  const columns = [
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      onCell: (_: ProductTypeSalesItem, index?: number) => {
        if (index === undefined) return {};
        const span = categoryRowSpans[index];
        if (span === 0) return { style: { display: "none" } };
        if (span > 1) return { rowSpan: span };
        return {};
      },
    },
    { title: "Product / Service", dataIndex: "name", key: "name" },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
    },
    {
      title: "Unit Price",
      dataIndex: "price",
      key: "price",
      align: "right" as const,
      render: (v: number) => fmt(v),
    },
    {
      title: "Total",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right" as const,
      render: (v: number) => fmt(v),
    },
  ];

  const handleExportCSV = () => {
    const typeLabel = type === "services" ? "services" : type === "products" ? "products" : "services-products";
    const fileName = `${typeLabel}-sales-report-${dayjs().format("YYYYMMDD-HHmm")}.csv`;
    const header = [
      "Category",
      "Product / Service",
      "Qty",
      "Unit Price",
      "Total",
    ].join(",");
    const rows = filteredItems.map((i) =>
      [
        `"${(i.category || "").replace(/"/g, '""')}"`,
        `"${(i.name || "").replace(/"/g, '""')}"`,
        i.quantity,
        i.price,
        i.total_amount,
      ].join(",")
    );
    const totalRow = ["", "TOTAL", totalQty, "", totalAmount].join(",");
    const csv = [header, ...rows, totalRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const typeLabel =
      type === "services"
        ? "services"
        : type === "products"
        ? "products"
        : "services-products";
    const fileName = `${typeLabel}-sales-report-${dayjs().format(
      "YYYYMMDD-HHmm"
    )}.pdf`;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const reportTitle = title;
    const dateLine = startDate && endDate
      ? `${dayjs(startDate).format("MMM DD, YYYY HH:mm")} - ${dayjs(endDate).format("MMM DD, YYYY HH:mm")}`
      : "";

    doc.setFontSize(14);
    doc.text(reportTitle, 14, 15);
    doc.setFontSize(10);
    doc.text(dateLine, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [["Product / Service", "Qty", "Unit Price", "Total"]],
      body: filteredItems.map((i) => [
        i.name,
        i.quantity,
        fmt(i.price),
        fmt(i.total_amount),
      ]),
      theme: "grid",
      styles: { fontSize: 9, halign: "left" },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      headStyles: { fillColor: [108, 28, 44], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(10);
    doc.text(`Grand Total: KES ${fmt(totalAmount)}`, 14, finalY + 10);
    doc.text(`Total Quantity: ${totalQty}`, 120, finalY + 10);

    doc.save(fileName);
  };

  const handleSendEmail = async (values: any) => {
    setEmailSending(true);
    try {
      const htmlTable = refToHtmlString(printRef);
      const ok = await sendSalesReportEmail({
        to: values.to,
        recipientName: values.recipientName,
        intro: values.intro,
        cc: values.cc,
        totals: {
          overallTotal: totalAmount,
          stockCost: totalCost,
          grossProfit: totalAmount - totalCost,
          commission: 0,
        },
        dateRange: { from: startDate, to: endDate },
        htmlTable,
      });
      if (ok) {
        setEmailModalOpen(false);
        emailForm.resetFields();
      }
    } finally {
      setEmailSending(false);
    }
  };

  const hasData = items.length > 0;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        destroyOnClose
        width={960}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                background: C.primaryLight,
                borderRadius: 7,
                padding: "4px 6px",
                color: C.primary,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              <FileTextOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>
              {title}
            </Text>
          </div>
        }
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Button
              icon={<MailOutlined />}
              disabled={loading || !hasData}
              onClick={() => setEmailModalOpen(true)}
              style={{ borderColor: C.primary, color: C.primary }}
            >
              Send via Email
            </Button>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
                disabled={loading || !hasData}
              >
                Export CSV
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={handleDownloadPDF}
                disabled={loading || !hasData}
                style={{ borderColor: C.primary, color: C.primary }}
              >
                Download PDF
              </Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                disabled={loading || !hasData}
                style={{ background: C.primary, borderColor: C.primary }}
              >
                Print
              </Button>
              <Button onClick={onClose}>Close</Button>
            </Space>
          </div>
        }
      >
        <Spin spinning={loading} tip="Loading report…">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hasData && !loading && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <SummaryCard
                  label="Total Sales"
                  value={`KES ${fmt(totalAmount)}`}
                  color={C.primary}
                  bg={C.primaryLight}
                />
                <SummaryCard
                  label="Stock Cost"
                  value={`KES ${fmt(totalCost)}`}
                  color={C.blue}
                  bg="#eff6ff"
                />
                <SummaryCard
                  label="Gross Profit"
                  value={`KES ${fmt(totalAmount - totalCost)}`}
                  color={C.green}
                  bg="#f0fdf4"
                />
                <SummaryCard
                  label="Total Qty"
                  value={totalQty.toString()}
                  color={C.orange}
                  bg="#fffbeb"
                />
              </div>
            )}

            {hasData && !loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 12px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  flexWrap: "wrap",
                }}
              >
                <Text style={{ fontSize: 12, color: C.subText, flex: 1 }}>
                  {dayjs(startDate).format("MMM DD, YYYY HH:mm")} →{" "}
                  {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                </Text>
                <Select
                  showSearch
                  allowClear
                  placeholder="All categories"
                  value={selectedCategory}
                  onChange={(v) => setSelectedCategory(v)}
                  options={categoryOptions}
                  style={{ minWidth: 220, maxWidth: 320 }}
                  filterOption={(i, o) =>
                    (o?.label ?? "").toLowerCase().includes(i.toLowerCase())
                  }
                />
              </div>
            )}

            {hasData ? (
              <div ref={printRef} style={{ padding: "0 4px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  {BRAND_NAME1 && BRAND_NAME1 !== "undefined undefined" && (
                    <Text strong style={{ fontSize: 16, display: "block" }}>
                      {BRAND_NAME1}
                    </Text>
                  )}
                  <Text
                    strong
                    style={{ fontSize: 14, display: "block", marginTop: 4 }}
                  >
                    {title}
                  </Text>
                  {selectedCategory && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Category: {selectedCategory}
                    </Text>
                  )}
                  {startDate && endDate && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(startDate).format("MMM DD, YYYY HH:mm")} →{" "}
                      {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                    </Text>
                  )}
                </div>

                <Table
                  size="small"
                  columns={columns}
                  dataSource={filteredItems}
                  rowKey={(record: ProductTypeSalesItem, index: number) =>
                    `${record.category}-${record.name}-${index}`
                  }
                  pagination={false}
                  bordered
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 24,
                    padding: "14px 0",
                    borderTop: `2px solid ${C.primary}`,
                  }}
                >
                  <Text strong style={{ fontSize: 14, color: C.primary }}>
                    Grand Total: KES {fmt(totalAmount)}
                  </Text>
                  <Text strong style={{ fontSize: 14, color: C.darkText }}>
                    Total Quantity: {totalQty}
                  </Text>
                </div>
              </div>
            ) : (
              <Empty
                description="No data found for the selected period"
                style={{ padding: "40px 0" }}
              />
            )}

            {hasData && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${C.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: C.subText,
                }}
              >
                <span>
                  Powered by <strong>{COOP_NAME}</strong>
                </span>
                <span>
                  Generated on {dayjs().format("MMM DD, YYYY [at] h:mm A")}
                </span>
              </div>
            )}
          </div>
        </Spin>
      </Modal>

      <Modal
        open={emailModalOpen}
        onCancel={() => {
          emailForm.resetFields();
          setEmailModalOpen(false);
        }}
        onOk={() => emailForm.submit()}
        confirmLoading={emailSending}
        okText="Send Report"
        okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
        title="Send Report via Email"
        width={480}
        destroyOnClose
      >
        <Form
          form={emailForm}
          layout="vertical"
          style={{ marginTop: 12 }}
          onFinish={handleSendEmail}
        >
          <Form.Item
            name="to"
            label="Recipient Email"
            rules={[
              { required: true, message: "Recipient email is required" },
              { type: "email", message: "Enter a valid email address" },
            ]}
          >
            <Input placeholder="manager@company.com" />
          </Form.Item>
          <Form.Item name="recipientName" label="Recipient Name">
            <Input placeholder="e.g. Alice" />
          </Form.Item>
          <Form.Item
            name="cc"
            label="CC (optional)"
            extra="Separate multiple addresses with commas"
          >
            <Input placeholder="cfo@company.com, accounts@company.com" />
          </Form.Item>
          <Form.Item name="intro" label="Personal Message (optional)">
            <Input.TextArea
              rows={3}
              placeholder="Please find the report for the selected period."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: string;
  color: string;
  bg: string;
}> = ({ label, value, color, bg }) => (
  <div
    style={{
      flex: "1 1 130px",
      background: bg,
      border: `1px solid ${color}20`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: "10px 14px",
    }}
  >
    <div style={{ marginBottom: 4 }}>
      <Text
        style={{
          fontSize: 10,
          color: C.subText,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          fontWeight: 700,
        }}
      >
        {label}
      </Text>
    </div>
    <Text strong style={{ fontSize: 14, color }}>
      {value}
    </Text>
  </div>
);

export default ProductTypeSalesModal;
