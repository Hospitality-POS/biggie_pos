import { useRef, useState } from "react";
import {
  ActionType,
  ProFormInstance,
  ProTable,
} from "@ant-design/pro-components";
import ExpandedRowContent from "./ExpandableInvoice";
import {
  Space, Tag, Button, Modal, Form, InputNumber,
  Select, Input, DatePicker, App, Tooltip, Typography,
} from "antd";
import {
  UserOutlined, DollarOutlined, FileDoneOutlined,
  PrinterOutlined, FileTextOutlined,
} from "@ant-design/icons";
import { getAllInvoices } from "@services/cart";
import { convertQuoteToInvoice, recordInvoicePayment } from "@services/accounting/invoice";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InvoiceReprintModal from "./InvoiceReprintModal";
import moment from "moment";

// ── Shared payment terms options ─────────────────────────────────────────────
const PAYMENT_TERMS = [
  { label: "Due on Receipt", value: "Due on Receipt" },
  { label: "Net 7", value: "Net 7" },
  { label: "Net 14", value: "Net 14" },
  { label: "Net 30", value: "Net 30" },
  { label: "Net 60", value: "Net 60" },
  { label: "Net 90", value: "Net 90" },
  { label: "50% Upfront", value: "50% Upfront" },
  { label: "Cash on Delivery", value: "Cash on Delivery" },
];

// ── Status tag ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Draft: "gold",
  Pending: "blue",
  Partially_Paid: "orange",
  Paid: "green",
  Overdue: "red",
  Voided: "default",
  Cancelled: "default",
};

const StatusTag = ({ status }: { status?: string }) => {
  if (!status) return null;
  return (
    <Tag color={STATUS_COLORS[status] || "default"}>
      {status === "Draft" ? "Quote" : status.replace("_", " ")}
    </Tag>
  );
};

// ── Convert Quote → Invoice modal ─────────────────────────────────────────────
const ConvertModal = ({
  invoice,
  open,
  onClose,
  onSuccess,
}: {
  invoice: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      convertQuoteToInvoice(id, data),
    onSuccess: () => {
      message.success("Quote converted to invoice");
      form.resetFields();
      onSuccess();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <FileDoneOutlined style={{ color: "#1890ff" }} />
          Convert Quote to Invoice — {invoice?.order_no}
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button
          key="submit" type="primary"
          loading={mutation.isPending}
          onClick={async () => {
            const v = await form.validateFields();
            mutation.mutate({
              id: invoice._id,
              data: { due_date: v.due_date ? v.due_date.toISOString() : undefined, notes: v.notes, terms: v.terms },
            });
          }}
        >
          Convert to Invoice
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="due_date" label="Due Date" rules={[{ required: true, message: "Due date required" }]}>
          <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
        </Form.Item>
        <Form.Item name="terms" label="Payment Terms">
          <Select placeholder="Select payment terms" allowClear options={PAYMENT_TERMS} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Record Payment modal ──────────────────────────────────────────────────────
const PaymentModal = ({
  invoice,
  open,
  onClose,
  onSuccess,
}: {
  invoice: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const { data: methodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => fetchAllPaymentMethods({}),
    enabled: open,
  });
  const methodOptions = (methodsData || []).map((m: any) => ({
    label: m.name,
    value: m._id,
  }));

  const amountDue = invoice?.amount_due ?? invoice?.grand_total ?? 0;

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      recordInvoicePayment(id, data),
    onSuccess: () => {
      message.success("Payment recorded successfully");
      form.resetFields();
      onSuccess();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <DollarOutlined style={{ color: "#52c41a" }} />
          Record Payment — {invoice?.order_no}
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button
          key="submit" type="primary"
          style={{ background: "#52c41a", borderColor: "#52c41a" }}
          loading={mutation.isPending}
          onClick={async () => {
            const v = await form.validateFields();
            mutation.mutate({
              id: invoice._id,
              data: { amount: v.amount, method_id: v.method_id, reference: v.reference, notes: v.notes },
            });
          }}
        >
          Record Payment
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ amount: amountDue }}>
        <Form.Item name="method_id" label="Payment Method" rules={[{ required: true }]}>
          <Select showSearch placeholder="M-Pesa / Bank / Cash"
            options={methodOptions} optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="amount" label={`Amount (KES) — Due: ${amountDue.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
          rules={[{ required: true }, { type: "number", min: 0.01, max: amountDue }]}>
          <InputNumber style={{ width: "100%" }} min={0.01} max={amountDue} precision={2}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => v!.replace(/,/g, "") as any} />
        </Form.Item>
        <Form.Item name="reference" label="Reference / Transaction Code">
          <Input placeholder="M-Pesa code, cheque no..." />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input placeholder="Optional" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── Print Quote — hidden iframe, no new tab ───────────────────────────────────
const printQuote = (record: any) => {
  const lines = record.items || [];
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quote ${record.order_no}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; color: #222; }
        h2 { font-size: 22px; margin-bottom: 2px; letter-spacing: 1px; }
        .badge { display: inline-block; background: #faad14; color: #fff; font-size: 11px;
                 padding: 2px 8px; border-radius: 4px; margin-bottom: 16px; }
        .meta { color: #555; margin-bottom: 24px; line-height: 1.8; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #f5f5f5; text-align: left; padding: 8px 10px;
             border-bottom: 2px solid #ddd; font-size: 12px; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        .totals-wrap { display: flex; justify-content: flex-end; }
        .totals { width: 280px; }
        .totals tr td { border: none; padding: 4px 6px; }
        .totals tr td:first-child { color: #555; }
        .totals tr td:last-child { text-align: right; font-weight: 500; }
        .grand td { font-weight: bold; font-size: 15px; border-top: 2px solid #222;
                    padding-top: 8px !important; }
        .footer { margin-top: 40px; color: #aaa; font-size: 11px; border-top: 1px solid #eee;
                  padding-top: 12px; }
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
          <tr>
            <th>#</th><th>Description</th><th>Qty</th>
            <th>Unit Price (KES)</th><th>VAT (KES)</th><th>Total (KES)</th>
          </tr>
        </thead>
        <tbody>
          ${lines.length
      ? lines.map((l: any, i: number) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${l.description || "—"}</td>
                  <td>${l.quantity}</td>
                  <td style="text-align:right">${(l.price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right">${(l.vat_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                  <td style="text-align:right">${((l.price * l.quantity) + (l.vat_amount || 0)).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                </tr>`).join("")
      : `<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">No line items</td></tr>`
    }
        </tbody>
      </table>
      <div class="totals-wrap">
        <table class="totals">
          <tr><td>Subtotal</td><td>KES ${(record.subtotal || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>VAT</td><td>KES ${(record.total_vat_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
          <tr class="grand"><td>Grand Total</td><td>KES ${(record.grand_total || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td></tr>
        </table>
      </div>
      <div class="footer">This is a quotation only and does not constitute a tax invoice.</div>
    </body>
    </html>`;

  // Create a hidden iframe, write the HTML into it, print, then remove it
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for iframe to fully render before printing
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Remove after print dialog closes (slight delay to be safe)
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
};

// ── Main table ────────────────────────────────────────────────────────────────
const InvoicesTable = () => {
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const queryClient = useQueryClient();

  const [convertTarget, setConvertTarget] = useState<any>(null);
  const [payTarget, setPayTarget] = useState<any>(null);

  const [queryParams, setQueryParams] = useState({
    page: 1, limit: 10,
    start_date: moment().startOf("day").toISOString(),
    end_date: moment().endOf("day").toISOString(),
  });

  const refreshTable = () => {
    actionRef.current?.reload();
    queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
  };

  const columns = [
    {
      title: "Order / Quote No.",
      dataIndex: "order_no",
      hideInSearch: false,
      copyable: true,
      render: (text: string, record: any) => (
        <Space>
          {record.status === "Draft"
            ? <FileTextOutlined style={{ color: "#faad14" }} />
            : <FileDoneOutlined style={{ color: "#1890ff" }} />}
          <Typography.Text>{text}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      hideInSearch: true,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: "Customer",
      dataIndex: ["customer_id", "customer_name"],
      hideInSearch: true,
      render: (name: string, record: any) =>
        name || record.counterparty_name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Table",
      dataIndex: ["table_id", "name"],
      key: "table",
      hideInSearch: false,
      fieldProps: { placeholder: "Enter table name" },
    },
    {
      title: "Closed By",
      dataIndex: ["served_by", "username"],
      key: "closed-by",
      hideInSearch: true,
      render: (text: string) => (
        <Tag color={text ? "green" : "error"}>
          {text ? <><UserOutlined /> {text}</> : "Deleted"}
        </Tag>
      ),
    },
    {
      title: "Amount (KES)",
      dataIndex: "grand_total",
      hideInSearch: true,
      align: "right" as const,
      render: (v: number) => v?.toLocaleString("en-KE", { minimumFractionDigits: 2 }) || "—",
    },
    {
      title: "Amount Due",
      dataIndex: "amount_due",
      hideInSearch: true,
      align: "right" as const,
      render: (v: number, record: any) => {
        if (!v || record.status === "Draft") return <Typography.Text type="secondary">—</Typography.Text>;
        return (
          <Typography.Text style={{ color: v > 0 ? "#fa8c16" : "#52c41a" }}>
            KES {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </Typography.Text>
        );
      },
    },
    {
      title: "Time Closed",
      dataIndex: "createdAt",
      hideInSearch: true,
      valueType: "dateTime",
      sorter: (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Actions",
      hideInSearch: true,
      key: "action",
      width: 180,
      render: (_: any, record: any) => (
        <Space size="small">
          {/* Quote actions */}
          {record.status === "Draft" && (
            <>
              <Tooltip title="Print Quote">
                <Button
                  size="small" icon={<PrinterOutlined />}
                  onClick={() => printQuote(record)}
                />
              </Tooltip>
              <Tooltip title="Convert to Invoice">
                <Button
                  size="small" type="primary" icon={<FileDoneOutlined />}
                  onClick={() => setConvertTarget(record)}
                >
                  Convert
                </Button>
              </Tooltip>
            </>
          )}

          {/* Invoice with outstanding balance — record payment */}
          {["Pending", "Partially_Paid", "Overdue"].includes(record.status) && (
            <Tooltip title="Record Payment">
              <Button
                size="small"
                type="primary"
                icon={<DollarOutlined />}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                onClick={() => setPayTarget(record)}
              >
                Pay
              </Button>
            </Tooltip>
          )}

          {/* Reprint — always available for POS invoices */}
          {record.source === "pos" && (
            <InvoiceReprintModal
              invoiceData={record}
              invoiceId={record?._id}
              orderNo={record?.order_no}
            />
          )}
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: any) => <ExpandedRowContent record={record} />;

  return (
    <>
      <ProTable
        rowKey="_id"
        cardBordered
        form={{
          onFinish: async (values) => {
            const { dateRange, ...rest } = values;
            setQueryParams({ ...rest, page: 1, limit: queryParams.limit });
            return true;
          },
          initialValues: {
            dateRange: [moment().startOf("day"), moment().endOf("day")],
          },
        }}
        search={{
          labelWidth: "auto",
          defaultCollapsed: false,
          searchText: "Search",
          resetText: "Reset",
          optionRender: (_, __, dom) => [...dom],
        }}
        pagination={{
          pageSize: queryParams.limit,
          current: queryParams.page,
          showQuickJumper: true,
          showSizeChanger: true,
          onChange: (page, pageSize) =>
            setQueryParams((prev) => ({ ...prev, page, limit: pageSize })),
        }}
        columns={[
          {
            title: "Date Range",
            dataIndex: "dateRange",
            valueType: "dateRange",
            hideInTable: true,
            fieldProps: {
              ranges: {
                Today: [moment().startOf("day"), moment().endOf("day")],
                Yesterday: [moment().subtract(1, "days").startOf("day"), moment().subtract(1, "days").endOf("day")],
                "This Week": [moment().startOf("week"), moment().endOf("week")],
                "Last Week": [moment().subtract(1, "week").startOf("week"), moment().subtract(1, "week").endOf("week")],
                "This Month": [moment().startOf("month"), moment().endOf("month")],
              },
            },
          },
          ...columns,
        ]}
        request={async (params) => {
          const { current, pageSize, dateRange, _timestamp, ...rest } = params;
          const startDate = dateRange?.[0]
            ? moment(dateRange[0]).startOf("day").toISOString()
            : moment().startOf("day").toISOString();
          const endDate = dateRange?.[1]
            ? moment(dateRange[1]).endOf("day").toISOString()
            : moment().endOf("day").toISOString();

          try {
            const data = await getAllInvoices({
              ...rest, page: current, limit: pageSize,
              start_date: startDate, end_date: endDate,
            });
            return { data: data || [], success: true, total: data.pagination?.total || 0 };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        tableAlertRender={({ selectedRowKeys }) => (
          <p>You have selected {selectedRowKeys?.length}</p>
        )}
        formRef={formRef}
        actionRef={actionRef}
        rowSelection={{ alwaysShowAlert: false, selections: false }}
        scroll={{ x: "inherit" }}
        toolbar={{ title: "Invoices & Quotes", tooltip: "Invoice Management" }}
        options={{ fullScreen: true }}
        expandable={{
          expandedRowRender,
          defaultExpandAllRows: false,
          expandIconColumnIndex: 1,
          columnTitle: " ",
        }}
        dateFormatter="string"
        rowClassName={(record) =>
          record.status === "Draft" ? "row-quote" : ""
        }
      />

      {/* Convert modal */}
      {convertTarget && (
        <ConvertModal
          invoice={convertTarget}
          open={!!convertTarget}
          onClose={() => setConvertTarget(null)}
          onSuccess={refreshTable}
        />
      )}

      {/* Payment modal */}
      {payTarget && (
        <PaymentModal
          invoice={payTarget}
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          onSuccess={refreshTable}
        />
      )}
    </>
  );
};

export default InvoicesTable;