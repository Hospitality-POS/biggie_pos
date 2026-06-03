import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button, Form, Input, Modal, Space, Typography } from "antd";
import {
  CalendarOutlined,
  DollarOutlined,
  InboxOutlined,
  MailOutlined,
  NumberOutlined,
  PlusOutlined,
  PrinterOutlined,
  SendOutlined,
  TruckOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import useSystemDetails from "@hooks/useSystemDetails";
import { ENTITY_NAME } from "@utils/config";
import { sendDeliveryNoteEmail, refToHtmlString } from "@services/emailReports";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  blue: "#3b82f6",
  orange: "#f97316",
  indigo: "#6366f1",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  white: "#ffffff",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtK = (v: number) => (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 0 });
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "—";

// ── Interfaces ────────────────────────────────────────────────────────────────
interface SendEmailValues {
  to: string;
  recipientName?: string;
  cc?: string;
  intro?: string;
}

// ── Delivery Note print content ───────────────────────────────────────────────
const DeliveryNoteContent = React.forwardRef<
  HTMLDivElement,
  { record: any; brand: string; phone: string; qr: string }
>(({ record, brand, phone, qr }, ref) => {
  const items = record.delivery_items || [];
  const totalAmount = items.reduce(
    (acc: number, item: any) => acc + (item.supplier_price || 0) * (item.quantity || 0),
    0
  );
  const deliveryCode = record.code || `DN-${record._id?.slice(-6).toUpperCase()}`;

  const isCustomer = record.direction === 'customer';
  
  const displayDeliveredBy = () => {
    if (!record.delivered_by) return "—";
    if (isCustomer) {
      // Customer delivery: delivered_by is a user ObjectId
      return record.delivered_by?.fullname || record.delivered_by || "—";
    } else {
      // Supplier delivery: delivered_by is a string (driver name)
      return record.delivered_by;
    }
  };

  const displayReceivedBy = () => {
    if (!record.received_by) return "—";
    if (isCustomer) {
      // Customer delivery: received_by is a string (customer name)
      return record.received_by;
    } else {
      // Supplier delivery: received_by is a user ObjectId
      return record.received_by?.fullname || record.received_by || "—";
    }
  };

  const metaRows = [
    { label: "Date", value: fmtDate(record.createdAt) },
    { label: "Status", value: record.delivery_status ? "✓ Delivered" : "⏳ Pending" },
    { label: "Delivered By", value: displayDeliveredBy() },
    { label: "Received By", value: displayReceivedBy() },
    { label: isCustomer ? "Customer" : "Supplier", value: isCustomer ? record.customer_id?.customer_name || "—" : record.supplier_id?.name || "—" },
    ...(isCustomer && record.customer_id?.phone ? [{ label: "Customer Phone", value: record.customer_id.phone }] : []),
    ...(!isCustomer && record.supplier_id?.phone ? [{ label: "Supplier Phone", value: record.supplier_id.phone }] : []),
  ];

  const thStyle: React.CSSProperties = {
    padding: "7px 9px",
    fontSize: 10,
    fontWeight: 700,
    color: C.white,
    background: C.primary,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    printColorAdjust: "exact",
    WebkitPrintColorAdjust: "exact",
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Segoe UI', system-ui, Arial, sans-serif",
        padding: 28,
        background: C.white,
        color: C.darkText,
        maxWidth: 480,
        margin: "0 auto",
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        paddingBottom: 14, borderBottom: `3px solid ${C.primary}`, marginBottom: 18, gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.darkText, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
            {brand}
          </div>
          {ENTITY_NAME && <div style={{ fontSize: 11, color: C.subText, marginTop: 2 }}>{ENTITY_NAME}</div>}
          {phone && <div style={{ fontSize: 11, color: C.subText, marginTop: 1 }}>{phone}</div>}
        </div>
        <div style={{
          background: C.primary, color: C.white,
          padding: "8px 14px", borderRadius: 8, textAlign: "center", flexShrink: 0,
          printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", opacity: 0.8, textTransform: "uppercase" }}>
            Delivery Note
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3, letterSpacing: "-0.3px" }}>
            {deliveryCode}
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px",
        background: "#f8fafc", border: `1px solid ${C.border}`,
        borderRadius: 9, padding: "12px 16px", marginBottom: 20,
      }}>
        {metaRows.map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 12, color: C.darkText, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Items label */}
      <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
        Items ({items.length})
      </div>

      {/* Items table — fixed layout for alignment */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "28px" }} />
          <col />
          <col style={{ width: "64px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "80px" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "center" }}>#</th>
            <th style={{ ...thStyle, textAlign: "left" }}>Item</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Unit Price</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => {
            const lineTotal = (item.supplier_price || 0) * (item.quantity || 0);
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? C.white : "#fafafa" }}>
                <td style={{ padding: "7px 8px", textAlign: "center", color: C.subText, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>
                  {i + 1}
                </td>
                <td style={{ padding: "7px 8px", fontWeight: 600, color: C.darkText, borderBottom: `1px solid ${C.border}` }}>
                  {item.inventory_id?.name || "N/A"}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>{item.quantity}</span>{" "}
                  <span style={{ fontSize: 10, color: C.subText }}>{item.unit_id?.name || ""}</span>
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: `1px solid ${C.border}` }}>
                  {fmtK(item.supplier_price || 0)}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: C.green, borderBottom: `1px solid ${C.border}` }}>
                  {fmtK(lineTotal)}
                </td>
              </tr>
            );
          })}
          {/* Total row inline with table */}
          <tr style={{ background: C.primaryLight }}>
            <td
              colSpan={4}
              style={{
                padding: "9px 8px", textAlign: "right",
                fontWeight: 700, fontSize: 11,
                color: C.primary, borderLeft: `3px solid ${C.primary}`,
                textTransform: "uppercase", letterSpacing: "0.4px",
              }}
            >
              Total Amount
            </td>
            <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: 800, fontSize: 14, color: C.primary }}>
              Ksh {fmtK(totalAmount)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      {record.notes && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a",
          borderRadius: 8, padding: "9px 12px", marginBottom: 20,
          fontSize: 11, color: "#374151",
        }}>
          <span style={{ fontWeight: 700, color: "#92400e" }}>Notes: </span>
          {record.notes}
        </div>
      )}

      {/* Signatures + QR */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        paddingTop: 16, borderTop: `1px solid ${C.border}`, gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 16 }}>
            <div>Generated: {new Date().toLocaleString("en-KE")}</div>
            <div style={{ marginTop: 2 }}>Ref: <span style={{ fontWeight: 600 }}>{deliveryCode}</span></div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Received By", "Authorized By"].map((label) => (
              <div key={label}>
                <div style={{ borderTop: "1px solid #94a3b8", width: 110, marginBottom: 4 }} />
                <div style={{ fontSize: 9, color: "#94a3b8" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <QRCodeCanvas value={qr || deliveryCode} size={72} style={{ display: "block" }} />
          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>{deliveryCode}</div>
        </div>
      </div>
    </div>
  );
});
DeliveryNoteContent.displayName = "DeliveryNoteContent";

// ── Send Email Sub-Modal ───────────────────────────────────────────────────────
const SendEmailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSend: (values: SendEmailValues) => Promise<void>;
  sending: boolean;
}> = ({ open, onClose, onSend, sending }) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSend(values);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleOk}
      confirmLoading={sending}
      okText={<Space><SendOutlined />Send Note</Space>}
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
      title={<Space><MailOutlined style={{ color: C.primary }} /><span>Send Delivery Note via Email</span></Space>}
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="to"
          label="Recipient Email"
          rules={[
            { required: true, message: "Recipient email is required" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined style={{ color: C.subText }} />} placeholder="supplier@company.com" />
        </Form.Item>
        <Form.Item name="recipientName" label="Recipient Name">
          <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="e.g. John Kamau" />
        </Form.Item>
        <Form.Item name="cc" label="CC (optional)" extra="Separate multiple addresses with commas">
          <Input prefix={<PlusOutlined style={{ color: C.subText }} />} placeholder="manager@company.com" />
        </Form.Item>
        <Form.Item name="intro" label="Personal Message (optional)">
          <Input.TextArea rows={3} placeholder="Please find the delivery note attached." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Print modal ───────────────────────────────────────────────────────────────
const PrintDeliveryModal = ({ record, trigger }: { record: any; trigger: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [emailModalOpen, setEmailModalOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1, PHONE_NO, QR_Code } = useSystemDetails();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    pageStyle: `
      @page { size: A5; margin: 8mm; }
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `,
  });

  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const items = record.delivery_items || [];
      const totalItems = items.length;
      const deliveredItems = items.filter((i: any) => (i.quantity || 0) > 0).length;
      const pendingItems = totalItems - deliveredItems;
      const htmlTable = refToHtmlString(componentRef);

      const ok = await sendDeliveryNoteEmail({
        to: values.to,
        recipientName: values.recipientName,
        intro: values.intro,
        cc: values.cc,
        noteMeta: {
          noteNumber: record.code || `DN-${record._id?.slice(-6).toUpperCase()}`,
          supplierName: record.supplier_id?.name,
          totalItems,
          deliveredItems,
          pendingItems,
        },
        htmlTable,
      });

      if (ok) setEmailModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title={
          <Space size={8}>
            <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
              <PrinterOutlined />
            </div>
            <Text strong style={{ fontSize: 13, color: C.darkText }}>
              Delivery Note — {record.code || "Preview"}
            </Text>
          </Space>
        }
        centered
        destroyOnClose
        width="min(520px, 96vw)"
        styles={{
          body: { padding: 0, maxHeight: "72vh", overflowY: "auto", background: "#f1f5f9" },
        }}
        footer={
          <Space style={{ width: "100%", justifyContent: "space-between" }} size={8}>
            <Button
              icon={<MailOutlined />}
              onClick={() => setEmailModalOpen(true)}
              style={{ borderColor: C.primary, color: C.primary, borderRadius: 7 }}
            >
              Send via Email
            </Button>
            <Space size={8}>
              <Button onClick={() => setOpen(false)} style={{ borderRadius: 7 }}>Close</Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 7, fontWeight: 500 }}
              >
                Print / Save PDF
              </Button>
            </Space>
          </Space>
        }
      >
        <div style={{ padding: "12px 10px" }}>
          <DeliveryNoteContent
            ref={componentRef}
            record={record}
            brand={BRAND_NAME1}
            phone={PHONE_NO}
            qr={QR_Code}
          />
        </div>
      </Modal>

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        sending={sending}
      />
    </>
  );
};

// ── Item row (expanded view) ──────────────────────────────────────────────────
const DeliveryItemRow: React.FC<{ item: any; index: number }> = ({ item, index }) => {
  const lineTotal = (item.supplier_price || 0) * (item.quantity || 0);

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 0", borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        background: "#eff6ff", borderRadius: 8, width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.blue, fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>
        {index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", marginBottom: 6 }}>
          {item.inventory_id?.name || "N/A"}
        </Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "4px 16px" }}>
          <Space size={5}>
            <NumberOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
            <Text style={{ fontSize: 12, color: C.subText }}>
              Qty: <Text strong style={{ color: "#374151" }}>{item.quantity} {item.unit_id?.name || "units"}</Text>
            </Text>
          </Space>
          <Space size={5}>
            <DollarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
            <Text style={{ fontSize: 12, color: C.subText }}>
              Price: <Text strong style={{ color: "#374151" }}>Ksh {fmtK(item.supplier_price || 0)}</Text>
            </Text>
          </Space>
          {item.createdAt && (
            <Space size={5}>
              <CalendarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
              <Text style={{ fontSize: 12, color: C.subText }}>{fmtDate(item.createdAt)}</Text>
            </Space>
          )}
        </div>
      </div>

      <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "6px 10px", textAlign: "right", flexShrink: 0 }}>
        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Total</Text>
        <Text strong style={{ fontSize: 13, color: C.green }}>Ksh {fmtK(lineTotal)}</Text>
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
const ExpandedDeliveryItems = ({ record }: { record: any }) => {
  const totalAmount =
    record.delivery_items?.reduce(
      (acc: number, item: any) => acc + (item.supplier_price || 0) * (item.quantity || 0),
      0
    ) || 0;

  return (
    <div style={{ padding: "12px 16px", background: "#f8fafc", borderTop: `1px solid ${C.border}` }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14, flexWrap: "wrap", gap: 8,
      }}>
        <Space size={10}>
          <div style={{ background: "#eff6ff", borderRadius: 8, padding: "5px 6px", color: C.blue, fontSize: 14, lineHeight: 1 }}>
            <InboxOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>Delivery Items</Text>
            <Text style={{ fontSize: 11, color: "#94a3b8" }}>
              {record.delivery_items?.length || 0} item{record.delivery_items?.length !== 1 ? "s" : ""}
            </Text>
          </div>
        </Space>

        <Space size={10}>
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 8, padding: "5px 12px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <DollarOutlined style={{ color: C.green, fontSize: 13 }} />
            <Text strong style={{ fontSize: 13, color: C.green }}>Ksh {fmtK(totalAmount)}</Text>
          </div>
          <PrintDeliveryModal
            record={record}
            trigger={
              <Button
                icon={<PrinterOutlined />}
                style={{
                  borderRadius: 8, fontWeight: 500, fontSize: 13,
                  background: C.primary, borderColor: C.primary,
                  color: C.white, height: 34,
                }}
              >
                Print Note
              </Button>
            }
          />
        </Space>
      </div>

      {/* Meta pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {(() => {
          const isCustomer = record.direction === 'customer';
          const displayDeliveredBy = () => {
            if (!record.delivered_by) return null;
            if (isCustomer) {
              return record.delivered_by?.fullname || record.delivered_by;
            } else {
              return record.delivered_by;
            }
          };
          const displayReceivedBy = () => {
            if (!record.received_by) return null;
            if (isCustomer) {
              return record.received_by;
            } else {
              return record.received_by?.fullname || record.received_by;
            }
          };
          
          const pills = [
            { icon: <TruckOutlined />, label: "Delivered by", value: displayDeliveredBy(), color: C.blue, bg: "#eff6ff" },
            { icon: <UserOutlined />, label: "Received by", value: displayReceivedBy(), color: C.indigo, bg: "#eef2ff" },
            { icon: <InboxOutlined />, label: isCustomer ? "Customer" : "Supplier", value: isCustomer ? record?.customer_id?.customer_name : record?.supplier_id?.name, color: C.orange, bg: "#fff7ed" },
          ];
          return pills.filter((m) => m.value).map((m, i) => (
            <Space key={i} size={6} style={{ background: m.bg, borderRadius: 7, padding: "5px 10px" }}>
              <span style={{ color: m.color, fontSize: 13 }}>{m.icon}</span>
              <Text style={{ fontSize: 11, color: C.subText }}>{m.label}:</Text>
              <Text strong style={{ fontSize: 12, color: C.darkText }}>{m.value}</Text>
            </Space>
          ));
        })()}
      </div>

      {/* Items list */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 14px" }}>
        {record.delivery_items?.length > 0 ? (
          record.delivery_items.map((item: any, index: number) => (
            <DeliveryItemRow key={item._id || index} item={item} index={index} />
          ))
        ) : (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>No items in this delivery</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedDeliveryItems;