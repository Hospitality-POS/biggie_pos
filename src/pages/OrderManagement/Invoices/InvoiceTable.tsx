import { useEffect, useRef, useState } from "react";
import {
  ActionType,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableInvoice";
import {
  Button, DatePicker, Drawer, Form, Input, InputNumber,
  Modal, Select, App, Tooltip, Typography,
} from "antd";
import {
  DollarOutlined, FileDoneOutlined,
  FileTextOutlined, FilterOutlined, PrinterOutlined, UserOutlined,
} from "@ant-design/icons";
import { getAllInvoices } from "@services/cart";
import { convertQuoteToInvoice, recordInvoicePayment } from "@services/accounting/invoice";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InvoiceReprintModal from "./InvoiceReprintModal";
import ManualInvoiceModal from "./ManualInvoiceModal";
import dayjs from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Mobile hook ────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Payment terms ──────────────────────────────────────────────────────────
const PAYMENT_TERMS = [
  "Due on Receipt", "Net 7", "Net 14", "Net 30",
  "Net 60", "Net 90", "50% Upfront", "Cash on Delivery",
].map((v) => ({ label: v, value: v }));

// ── CSS-only tags ──────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Draft: { bg: "#fffbeb", color: C.orange, border: "#fde68a" },
  Pending: { bg: "#eff6ff", color: C.blue, border: "#bfdbfe" },
  Partially_Paid: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  Paid: { bg: "#f0fdf4", color: C.green, border: "#bbf7d0" },
  Overdue: { bg: "#fef2f2", color: C.red, border: "#fecaca" },
  Voided: { bg: C.bg, color: C.subText, border: C.border },
  Cancelled: { bg: C.bg, color: C.subText, border: C.border },
};

const StatusTag = ({ status }: { status?: string }) => {
  if (!status) return null;
  const s = STATUS_CFG[status] ?? STATUS_CFG.Voided;
  return (
    <span style={{
      display: "inline-block", borderRadius: 5, padding: "2px 8px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status === "Draft" ? "Quote" : status.replace("_", " ")}
    </span>
  );
};

const ClosedByTag = ({ username }: { username?: string }) =>
  username ? (
    <span style={{
      display: "inline-block", borderRadius: 5, padding: "2px 8px",
      fontSize: 10, fontWeight: 700, background: "#f0fdf4",
      color: C.green, border: "1px solid #bbf7d0",
    }}>
      <UserOutlined style={{ marginRight: 3 }} />{username}
    </span>
  ) : (
    <span style={{
      display: "inline-block", borderRadius: 5, padding: "2px 8px",
      fontSize: 10, fontWeight: 700, background: "#fef2f2",
      color: C.red, border: "1px solid #fecaca",
    }}>
      Deleted
    </span>
  );

// ── Modal title / footer helpers ───────────────────────────────────────────
const modalTitle = (icon: React.ReactNode, iconColor: string, label: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{
      background: C.primaryLight, borderRadius: 7,
      padding: "4px 6px", color: iconColor, fontSize: 14, lineHeight: 1,
    }}>
      {icon}
    </div>
    <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>
  </div>
);

const modalFooter = (
  onCancel: () => void, onOk: () => void,
  loading: boolean, okLabel: string, okColor = C.primary,
) => [
    <Button key="cancel" onClick={onCancel} style={{ borderRadius: 8 }}>Cancel</Button>,
    <Button key="submit" type="primary" loading={loading} onClick={onOk}
      style={{ background: okColor, borderColor: okColor, borderRadius: 8 }}>
      {okLabel}
    </Button>,
  ];

// ── Mobile filter drawer ───────────────────────────────────────────────────
const MobileFilterDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  onSearch: (params: any) => void;
}> = ({ open, onClose, onSearch }) => {
  const [form] = Form.useForm();

  const handleApply = async () => {
    const v = await form.validateFields();
    onSearch(v);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="auto"
      title={modalTitle(<FilterOutlined />, C.primary, "Filter Invoices")}
      destroyOnClose
      styles={{
        body: { padding: "16px 16px 0" },
        footer: { padding: "12px 16px", borderTop: `1px solid ${C.border}` },
      }}
      footer={
        <div style={{ display: "flex", gap: 8 }}>
          <Button block onClick={() => { form.resetFields(); onSearch({}); onClose(); }}
            style={{ borderRadius: 8 }}>
            Reset
          </Button>
          <Button block type="primary" onClick={handleApply}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
            Apply Filters
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="dateRange" label="Date Range">
          <RangePicker
            style={{ width: "100%", borderRadius: 8 }}
            presets={[
              { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
              { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
              { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
              { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
            ]}
          />
        </Form.Item>
        <Form.Item name="order_no" label="Order / Quote No.">
          <Input placeholder="Enter order number" style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item name="name" label="Table Name">
          <Input placeholder="Enter table name" style={{ borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

// ── Mobile invoice card ────────────────────────────────────────────────────
const MobileInvoiceCard: React.FC<{
  record: any;
  onConvert: (r: any) => void;
  onPay: (r: any) => void;
  onExpand: (r: any) => void;
  expanded: boolean;
}> = ({ record, onConvert, onPay, onExpand, expanded }) => (
  <div style={{
    background: "#fff", border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "12px 14px", marginBottom: 10,
  }}>
    {/* Top row */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {record.status === "Draft"
          ? <FileTextOutlined style={{ color: C.orange, fontSize: 13 }} />
          : <FileDoneOutlined style={{ color: C.blue, fontSize: 13 }} />}
        <Text strong style={{ fontSize: 13, color: C.darkText }}>{record.order_no}</Text>
      </div>
      <StatusTag status={record.status} />
    </div>

    {/* Meta */}
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
      {(record.customer_id?.customer_name || record.counterparty_name) && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Customer</Text>
          <Text style={{ fontSize: 11 }}>{record.customer_id?.customer_name || record.counterparty_name}</Text>
        </div>
      )}
      {record.table_id?.name && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Table</Text>
          <Text style={{ fontSize: 11 }}>{record.table_id.name}</Text>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: C.subText }}>Closed By</Text>
        <ClosedByTag username={record.served_by?.username} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: C.subText }}>Amount</Text>
        <Text strong style={{ fontSize: 12 }}>
          {record.grand_total ? `KES ${fmt(record.grand_total)}` : "—"}
        </Text>
      </div>
      {record.amount_due > 0 && record.status !== "Draft" && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: C.subText }}>Due</Text>
          <Text strong style={{ fontSize: 12, color: C.orange }}>KES {fmt(record.amount_due)}</Text>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: C.subText }}>Date</Text>
        <Text style={{ fontSize: 11, color: C.subText }}>
          {record.createdAt ? dayjs(record.createdAt).format("DD MMM YYYY HH:mm") : "—"}
        </Text>
      </div>
    </div>

    {/* Actions */}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
      <Button size="small" onClick={() => onExpand(record)}
        style={{ borderRadius: 6, flex: "1 1 auto", fontSize: 11 }}>
        {expanded ? "Hide Details" : "View Details"}
      </Button>

      {record.status === "Draft" && (
        <>
          <Button size="small" icon={<PrinterOutlined />}
            onClick={() => printQuote(record)}
            style={{ borderRadius: 6, fontSize: 11 }} />
          <Button size="small" type="primary" icon={<FileDoneOutlined />}
            onClick={() => onConvert(record)}
            style={{ background: C.blue, borderColor: C.blue, borderRadius: 6, fontSize: 11 }}>
            Convert
          </Button>
        </>
      )}

      {["Pending", "Partially_Paid", "Overdue"].includes(record.status) && (
        <Button size="small" type="primary" icon={<DollarOutlined />}
          onClick={() => onPay(record)}
          style={{ background: C.green, borderColor: C.green, borderRadius: 6, fontSize: 11 }}>
          Pay
        </Button>
      )}

      {record.source === "pos" && (
        <InvoiceReprintModal
          invoiceData={record}
          invoiceId={record?._id}
          orderNo={record?.order_no}
        />
      )}
    </div>

    {/* Expanded details */}
    {expanded && (
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <ExpandedRowContent record={record} />
      </div>
    )}
  </div>
);

// ── Convert modal ──────────────────────────────────────────────────────────
const ConvertModal: React.FC<{
  invoice: any; open: boolean; onClose: () => void; onSuccess: () => void;
}> = ({ invoice, open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => convertQuoteToInvoice(id, data),
    onSuccess: () => {
      message.success("Quote converted to invoice");
      form.resetFields();
      onSuccess();
      onClose();
    },
  });

  const handleOk = async () => {
    const v = await form.validateFields();
    mutation.mutate({
      id: invoice._id,
      data: {
        due_date: v.due_date ? v.due_date.toISOString() : undefined,
        notes: v.notes, terms: v.terms,
      },
    });
  };

  return (
    <Modal
      open={open} onCancel={onClose} destroyOnClose
      style={{ top: 20 }} width="min(480px, 96vw)"
      styles={{ body: { padding: "20px 24px" } }}
      title={modalTitle(<FileDoneOutlined />, C.blue, `Convert Quote — ${invoice?.order_no}`)}
      footer={modalFooter(onClose, handleOk, mutation.isPending, "Convert to Invoice", C.blue)}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="due_date" label="Due Date" rules={[{ required: true, message: "Due date required" }]}>
          <DatePicker style={{ width: "100%", borderRadius: 8 }} format="DD MMM YYYY" />
        </Form.Item>
        <Form.Item name="terms" label="Payment Terms">
          <Select placeholder="Select payment terms" allowClear options={PAYMENT_TERMS} style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} style={{ borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Payment modal ──────────────────────────────────────────────────────────
const PaymentModal: React.FC<{
  invoice: any; open: boolean; onClose: () => void; onSuccess: () => void;
}> = ({ invoice, open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const { data: methodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => fetchAllPaymentMethods({}),
    enabled: open,
  });
  const methodOptions = (methodsData || []).map((m: any) => ({ label: m.name, value: m._id }));
  const amountDue = invoice?.amount_due ?? invoice?.grand_total ?? 0;

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => recordInvoicePayment(id, data),
    onSuccess: () => {
      message.success("Payment recorded successfully");
      form.resetFields();
      onSuccess();
      onClose();
    },
  });

  const handleOk = async () => {
    const v = await form.validateFields();
    mutation.mutate({
      id: invoice._id,
      data: { amount: v.amount, method_id: v.method_id, reference: v.reference, notes: v.notes },
    });
  };

  return (
    <Modal
      open={open} onCancel={onClose} destroyOnClose
      style={{ top: 20 }} width="min(480px, 96vw)"
      styles={{ body: { padding: "20px 24px" } }}
      title={modalTitle(<DollarOutlined />, C.green, `Record Payment — ${invoice?.order_no}`)}
      footer={modalFooter(onClose, handleOk, mutation.isPending, "Record Payment", C.green)}
    >
      <div style={{
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 8, padding: "10px 14px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <Text style={{ fontSize: 12, color: C.subText }}>Amount Due</Text>
        <Text strong style={{ fontSize: 15, color: C.green }}>KES {fmt(amountDue)}</Text>
      </div>

      <Form form={form} layout="vertical" initialValues={{ amount: amountDue }}>
        <Form.Item name="method_id" label="Payment Method" rules={[{ required: true }]}>
          <Select showSearch placeholder="M-Pesa / Bank / Cash"
            options={methodOptions} optionFilterProp="label" style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item name="amount" label="Amount (KES)"
          rules={[{ required: true }, { type: "number", min: 0.01, max: amountDue }]}>
          <InputNumber style={{ width: "100%", borderRadius: 8 }}
            min={0.01} max={amountDue} precision={2}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => v!.replace(/,/g, "") as any} />
        </Form.Item>
        <Form.Item name="reference" label="Reference / Transaction Code">
          <Input placeholder="M-Pesa code, cheque no..." style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input placeholder="Optional" style={{ borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Print quote ────────────────────────────────────────────────────────────
const printQuote = (record: any) => {
  const lines = record.items || [];
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Quote ${record.order_no}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; color: #222; }
    h2 { font-size: 22px; margin-bottom: 2px; letter-spacing: 1px; }
    .badge { display: inline-block; background: #f59e0b; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-bottom: 16px; }
    .meta { color: #555; margin-bottom: 24px; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f5f5f5; text-align: left; padding: 8px 10px; border-bottom: 2px solid #ddd; font-size: 12px; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; }
    .totals-wrap { display: flex; justify-content: flex-end; }
    .totals { width: 280px; }
    .totals tr td { border: none; padding: 4px 6px; }
    .totals tr td:first-child { color: #555; }
    .totals tr td:last-child { text-align: right; font-weight: 500; }
    .grand td { font-weight: bold; font-size: 15px; border-top: 2px solid #222; padding-top: 8px !important; }
    .footer { margin-top: 40px; color: #aaa; font-size: 11px; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <h2>QUOTE</h2>
  <div class="badge">Draft — Not a Tax Invoice</div>
  <div class="meta">
    <strong>Quote No:</strong> ${record.order_no || "—"}<br/>
    <strong>Date:</strong> ${record.issue_date ? new Date(record.issue_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}<br/>
    <strong>Customer:</strong> ${record.counterparty_name || record.customer_id?.customer_name || "—"}<br/>
    ${record.notes ? `<strong>Notes:</strong> ${record.notes}<br/>` : ""}
    ${record.terms ? `<strong>Terms:</strong> ${record.terms}` : ""}
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price (KES)</th><th>VAT (KES)</th><th>Total (KES)</th></tr>
    </thead>
    <tbody>
      ${lines.length
      ? lines.map((l: any, i: number) => `<tr>
            <td>${i + 1}</td><td>${l.description || "—"}</td><td>${l.quantity}</td>
            <td style="text-align:right">${fmt(l.price || 0)}</td>
            <td style="text-align:right">${fmt(l.vat_amount || 0)}</td>
            <td style="text-align:right">${fmt((l.price * l.quantity) + (l.vat_amount || 0))}</td>
          </tr>`).join("")
      : `<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">No line items</td></tr>`
    }
    </tbody>
  </table>
  <div class="totals-wrap">
    <table class="totals">
      <tr><td>Subtotal</td><td>KES ${fmt(record.subtotal || 0)}</td></tr>
      <tr><td>VAT</td><td>KES ${fmt(record.total_vat_amount || 0)}</td></tr>
      <tr class="grand"><td>Grand Total</td><td>KES ${fmt(record.grand_total || 0)}</td></tr>
    </table>
  </div>
  <div class="footer">This is a quotation only and does not constitute a tax invoice.</div>
</body>
</html>`;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
};

// ── Main ───────────────────────────────────────────────────────────────────
const InvoicesTable = () => {
  const isMobile = useIsMobile();
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const queryClient = useQueryClient();

  const [convertTarget, setConvertTarget] = useState<any>(null);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileData, setMobileData] = useState<any[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileTotal, setMobileTotal] = useState(0);
  const [mobileFilters, setMobileFilters] = useState<any>({});

  // ── ManualInvoiceModal state ───────────────────────────────────────────
  const [manualModalOpen, setManualModalOpen] = useState(false);

  const [queryParams, setQueryParams] = useState({
    page: 1, limit: 10,
    start_date: dayjs().startOf("day").toISOString(),
    end_date: dayjs().endOf("day").toISOString(),
  });

  // Reloads ProTable (desktop) and mobile list together
  const refreshTable = () => {
    actionRef.current?.reload();
    queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
    if (isMobile) loadMobileData(mobilePage, mobileFilters);
  };

  // Mobile data loading
  const loadMobileData = async (page: number, filters: any = {}) => {
    setMobileLoading(true);
    try {
      const { dateRange, ...rest } = filters;
      const data = await getAllInvoices({
        ...rest, page, limit: 10,
        start_date: dateRange?.[0] ? dayjs(dateRange[0]).startOf("day").toISOString() : dayjs().startOf("day").toISOString(),
        end_date: dateRange?.[1] ? dayjs(dateRange[1]).endOf("day").toISOString() : dayjs().endOf("day").toISOString(),
      });
      setMobileData(page === 1 ? (data || []) : (prev) => [...prev, ...(data || [])]);
      setMobileTotal(data.pagination?.total || 0);
    } finally {
      setMobileLoading(false);
    }
  };

  useEffect(() => {
    if (isMobile) loadMobileData(1, mobileFilters);
  }, [isMobile]);

  const handleMobileFilter = (filters: any) => {
    setMobileFilters(filters);
    setMobilePage(1);
    loadMobileData(1, filters);
  };

  const handleLoadMore = () => {
    const next = mobilePage + 1;
    setMobilePage(next);
    loadMobileData(next, mobileFilters);
  };

  const desktopColumns = [
    {
      title: "Order / Quote No.", dataIndex: "order_no",
      hideInSearch: false, copyable: true,
      render: (text: string, record: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {record.status === "Draft"
            ? <FileTextOutlined style={{ color: C.orange, fontSize: 13 }} />
            : <FileDoneOutlined style={{ color: C.blue, fontSize: 13 }} />}
          <Text style={{ fontSize: 12 }}>{text}</Text>
        </div>
      ),
    },
    {
      title: "Status", dataIndex: "status", hideInSearch: true,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: "Customer", dataIndex: ["customer_id", "customer_name"], hideInSearch: true,
      render: (name: string, record: any) =>
        name || record.counterparty_name
          ? <Text style={{ fontSize: 12 }}>{name || record.counterparty_name}</Text>
          : <Text style={{ color: C.subText }}>—</Text>,
    },
    {
      title: "Table", dataIndex: ["table_id", "name"], key: "table",
      hideInSearch: false, fieldProps: { placeholder: "Enter table name" },
      render: (text: string) => <Text style={{ fontSize: 12 }}>{text || "—"}</Text>,
    },
    {
      title: "Closed By", dataIndex: ["served_by", "username"], key: "closed-by", hideInSearch: true,
      render: (text: string) => <ClosedByTag username={text} />,
    },
    {
      title: "Amount (KES)", dataIndex: "grand_total", hideInSearch: true, align: "right" as const,
      render: (v: number) => <Text strong style={{ fontSize: 12 }}>{v ? `KES ${fmt(v)}` : "—"}</Text>,
    },
    {
      title: "Amount Due", dataIndex: "amount_due", hideInSearch: true, align: "right" as const,
      render: (v: number, record: any) => {
        if (!v || record.status === "Draft") return <Text style={{ color: C.subText }}>—</Text>;
        return <Text strong style={{ fontSize: 12, color: v > 0 ? C.orange : C.green }}>KES {fmt(v)}</Text>;
      },
    },
    {
      title: "Time Closed", dataIndex: "createdAt", hideInSearch: true, valueType: "dateTime",
      render: (text: string) => (
        <Text style={{ fontSize: 12, color: C.subText }}>
          {text ? dayjs(text).format("DD MMM YYYY HH:mm") : "—"}
        </Text>
      ),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Actions", hideInSearch: true, key: "action", width: 180,
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          {record.status === "Draft" && (
            <>
              <Tooltip title="Print Quote">
                <Button size="small" icon={<PrinterOutlined />}
                  onClick={() => printQuote(record)} style={{ borderRadius: 6 }} />
              </Tooltip>
              <Tooltip title="Convert to Invoice">
                <Button size="small" type="primary" icon={<FileDoneOutlined />}
                  onClick={() => setConvertTarget(record)}
                  style={{ background: C.blue, borderColor: C.blue, borderRadius: 6 }}>
                  Convert
                </Button>
              </Tooltip>
            </>
          )}
          {["Pending", "Partially_Paid", "Overdue"].includes(record.status) && (
            <Tooltip title="Record Payment">
              <Button size="small" type="primary" icon={<DollarOutlined />}
                onClick={() => setPayTarget(record)}
                style={{ background: C.green, borderColor: C.green, borderRadius: 6 }}>
                Pay
              </Button>
            </Tooltip>
          )}
          {record.source === "pos" && (
            <InvoiceReprintModal invoiceData={record} invoiceId={record?._id} orderNo={record?.order_no} />
          )}
        </div>
      ),
    },
  ];

  // ── Mobile render ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Mobile header */}
        <div style={{
          background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
          overflow: "hidden", marginBottom: 12,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", background: C.bg, borderBottom: `1px solid ${C.border}`,
          }}>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Invoices & Quotes</Text>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="small" type="primary" icon={<FileDoneOutlined />}
                onClick={() => setManualModalOpen(true)}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                New Invoice
              </Button>
              <Button size="small" icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}
                style={{ borderRadius: 8, borderColor: C.border }}>
                Filter
              </Button>
            </div>
          </div>

          {/* Summary strip */}
          <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}` }}>
            <Text style={{ fontSize: 11, color: C.subText }}>
              {mobileTotal} invoice{mobileTotal !== 1 ? "s" : ""} found
            </Text>
          </div>
        </div>

        {/* Cards */}
        {mobileLoading && mobilePage === 1 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.subText }}>Loading…</div>
        ) : mobileData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.subText }}>No invoices found.</div>
        ) : (
          <>
            {mobileData.map((record) => (
              <MobileInvoiceCard
                key={record._id}
                record={record}
                onConvert={setConvertTarget}
                onPay={setPayTarget}
                expanded={expandedId === record._id}
                onExpand={(r) => setExpandedId(expandedId === r._id ? null : r._id)}
              />
            ))}

            {mobileData.length < mobileTotal && (
              <Button block onClick={handleLoadMore} loading={mobileLoading}
                style={{ borderRadius: 8, marginBottom: 16 }}>
                Load More ({mobileData.length} / {mobileTotal})
              </Button>
            )}
          </>
        )}

        <MobileFilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onSearch={handleMobileFilter}
        />

        {convertTarget && (
          <ConvertModal invoice={convertTarget} open={!!convertTarget}
            onClose={() => setConvertTarget(null)} onSuccess={refreshTable} />
        )}
        {payTarget && (
          <PaymentModal invoice={payTarget} open={!!payTarget}
            onClose={() => setPayTarget(null)} onSuccess={refreshTable} />
        )}

        <ManualInvoiceModal
          open={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          onSuccess={refreshTable}
        />
      </>
    );
  }

  // ── Desktop render ─────────────────────────────────────────────────────
  return (
    <>
      <ProTable
        rowKey="_id"
        cardBordered
        formRef={formRef}
        actionRef={actionRef}
        form={{
          onFinish: async (values) => {
            const { dateRange, ...rest } = values;
            setQueryParams({ ...rest, page: 1, limit: queryParams.limit });
            return true;
          },
          initialValues: { dateRange: [dayjs().startOf("day"), dayjs().endOf("day")] },
        }}
        search={{
          labelWidth: "auto", defaultCollapsed: false,
          searchText: "Search", resetText: "Reset",
          optionRender: (_, __, dom) => [...dom],
        }}
        // "New Invoice" button in the ProTable toolbar
        toolBarRender={() => [
          <Button
            key="new-invoice"
            type="primary"
            icon={<FileDoneOutlined />}
            onClick={() => setManualModalOpen(true)}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}
          >
            New Invoice
          </Button>,
        ]}
        pagination={{
          pageSize: queryParams.limit, current: queryParams.page,
          showQuickJumper: true, showSizeChanger: true,
          onChange: (page, pageSize) => setQueryParams((prev) => ({ ...prev, page, limit: pageSize })),
        }}
        columns={[
          {
            title: "Date Range", dataIndex: "dateRange",
            valueType: "dateRange", hideInTable: true,
            fieldProps: {
              ranges: {
                Today: [dayjs().startOf("day"), dayjs().endOf("day")],
                Yesterday: [dayjs().subtract(1, "days").startOf("day"), dayjs().subtract(1, "days").endOf("day")],
                "This Week": [dayjs().startOf("week"), dayjs().endOf("week")],
                "Last Week": [dayjs().subtract(1, "week").startOf("week"), dayjs().subtract(1, "week").endOf("week")],
                "This Month": [dayjs().startOf("month"), dayjs().endOf("month")],
              },
            },
          },
          ...desktopColumns,
        ]}
        request={async (params) => {
          const { current, pageSize, dateRange, _timestamp, ...rest } = params;
          try {
            const data = await getAllInvoices({
              ...rest, page: current, limit: pageSize,
              start_date: dateRange?.[0] ? dayjs(dateRange[0]).startOf("day").toISOString() : dayjs().startOf("day").toISOString(),
              end_date: dateRange?.[1] ? dayjs(dateRange[1]).endOf("day").toISOString() : dayjs().endOf("day").toISOString(),
            });
            return { data: data || [], success: true, total: data.pagination?.total || 0 };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        tableAlertRender={({ selectedRowKeys }) => <p>You have selected {selectedRowKeys?.length}</p>}
        rowSelection={{ alwaysShowAlert: false, selections: false }}
        scroll={{ x: "inherit" }}
        toolbar={{ title: "Invoices & Quotes", tooltip: "Invoice Management" }}
        options={{ fullScreen: true }}
        expandable={{
          expandedRowRender: (record) => <ExpandedRowContent record={record} />,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
          columnTitle: " ",
        }}
        dateFormatter="string"
        rowClassName={(record) => record.status === "Draft" ? "row-quote" : ""}
      />

      {convertTarget && (
        <ConvertModal invoice={convertTarget} open={!!convertTarget}
          onClose={() => setConvertTarget(null)} onSuccess={refreshTable} />
      )}
      {payTarget && (
        <PaymentModal invoice={payTarget} open={!!payTarget}
          onClose={() => setPayTarget(null)} onSuccess={refreshTable} />
      )}

      {/* ManualInvoiceModal — onSuccess calls actionRef.reload() via refreshTable */}
      <ManualInvoiceModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSuccess={refreshTable}
      />
    </>
  );
};

export default InvoicesTable;