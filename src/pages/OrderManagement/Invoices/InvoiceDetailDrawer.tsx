import React, { useRef, useState } from "react";
import { Drawer, Button, Spin, Typography, Tooltip, Space, Table, Tag, Modal, Form, Input, Select, message } from "antd";
import {
  CheckCircleOutlined,
  FilePdfOutlined,
  PrinterFilled,
  PrinterOutlined,
  ArrowRightOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSystemDetails from "@hooks/useSystemDetails";
import { getAllInvoices } from "@services/cart";
import { getNotesByInvoice } from "@services/accounting/notes";
import { createSalesReceipt, getSalesReceipts } from "@services/accounting/salesReceipts";
import { getAllAccounts } from "@services/accounting/accounts";
import {
  TEMPLATES,
  TemplateId,
  InvoiceForPrint,
  SystemDetails,
} from "./InvoiceTemplates";
import { usePrimaryColor } from "../../../context/PrimaryColorContext";

const { Text } = Typography;

// Palette
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// Props
interface InvoiceDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  invoiceId: string | null;
}

// Template thumbnail
const TemplateThumbnail: React.FC<{
  tpl: (typeof TEMPLATES)[number];
  selected: boolean;
  onSelect: () => void;
}> = ({ tpl, selected, onSelect }) => {
  const primaryColor = usePrimaryColor();
  
  return (
  <button
    onClick={onSelect}
    style={{
      flex: "0 0 96px",
      cursor: "pointer",
      border: selected ? `2.5px solid ${primaryColor}` : `1.5px solid ${C.border}`,
      borderRadius: 9,
      overflow: "hidden",
      background: "#fff",
      padding: 0,
      transition: "border-color 0.15s, transform 0.12s",
      transform: selected ? "scale(1.05)" : "scale(1)",
      boxShadow: selected ? `0 0 0 3px ${primaryColor}20` : "none",
      position: "relative",
    }}
  >
    <div
      style={{
        height: 54,
        background: tpl.id === 1 ? primaryColor : tpl.thumbBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ width: "68%", opacity: 0.42 }}>
        <div style={{ height: 3, background: tpl.thumbAccent, borderRadius: 2, marginBottom: 4 }} />
        <div style={{ height: 2, background: tpl.thumbAccent, borderRadius: 2, marginBottom: 3, width: "80%" }} />
        <div style={{ height: 2, background: tpl.thumbAccent, borderRadius: 2, width: "55%" }} />
      </div>
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 5,
            background: primaryColor,
            borderRadius: "50%",
            width: 15,
            height: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircleOutlined style={{ color: "#fff", fontSize: 9 }} />
        </div>
      )}
    </div>
    <div style={{ padding: "5px 6px", borderTop: `1px solid ${C.border}` }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: selected ? 700 : 500,
          color: selected ? primaryColor : C.darkText,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {tpl.name}
      </div>
    </div>
  </button>
);
};

// Main component
const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  open,
  onClose,
  invoiceId,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(1);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();
  const queryClient = useQueryClient();

  // One ref per template
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);
  const ref5 = useRef<HTMLDivElement>(null);
  const ref6 = useRef<HTMLDivElement>(null);
  const allRefs: Record<TemplateId, React.RefObject<HTMLDivElement>> = {
    1: ref1, 2: ref2, 3: ref3, 4: ref4, 5: ref5, 6: ref6,
  };

  const sys: SystemDetails = useSystemDetails();
  const primaryColor = usePrimaryColor();

  // Fetch invoice data
  const { data: invoiceData, isLoading } = useQuery<InvoiceForPrint>({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: async () => {
      const res = await getAllInvoices({ invoice_id: invoiceId!, limit: 1 });
      const found = Array.isArray(res) ? res[0] : res?.data?.[0];
      return found;
    },
    enabled: open && !!invoiceId,
    staleTime: 30_000,
  });

  // Fetch credit notes for the invoice
  const { data: notesData } = useQuery({
    queryKey: ["notes-by-invoice", invoiceId],
    queryFn: () => getNotesByInvoice(invoiceId!, localStorage.getItem("shopId") || ""),
    enabled: open && !!invoiceId,
    staleTime: 30_000,
  });

  // Fetch sales receipts linked to this invoice
  const { data: receiptsData } = useQuery({
    queryKey: ["sales-receipts-by-invoice", invoiceId],
    queryFn: () => getSalesReceipts({}),
    enabled: open && !!invoiceId,
    staleTime: 30_000,
  });

  const linkedReceipts = receiptsData?.receipts?.filter((r: any) => r.invoice_id?._id === invoiceId) || [];

  // Fetch accounts for payment modal
  const { data: accountsData } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => getAllAccounts({ is_active: true }),
    enabled: paymentModalOpen,
    staleTime: 60_000,
  });

  const allAccounts = accountsData?.accounts || [];
  const cashAccounts = allAccounts.filter((a: any) => a.account_type === "ASSET" && a.account_name.toLowerCase().includes("cash"));
  const bankAccounts = allAccounts.filter((a: any) => a.account_type === "ASSET" && a.account_name.toLowerCase().includes("bank"));
  const paymentAccountOptions = [...cashAccounts, ...bankAccounts].map((a: any) => ({
    label: `${a.account_code} — ${a.account_name}`,
    value: a._id,
  }));

  const inv: InvoiceForPrint | undefined = invoiceData ? {
    ...invoiceData,
    credit_notes: notesData?.notes || [],
  } : undefined;

  const PAGE_STYLE = `
    @page { size: A4 portrait; margin: 12mm; }
    @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  `;

  const print1 = useReactToPrint({ 
    content: () => ref1.current, 
    documentTitle: `Invoice-${inv?.order_no || inv?.invoice_no}`, 
    pageStyle: PAGE_STYLE 
  });
  const print2 = useReactToPrint({ 
    content: () => ref2.current, 
    documentTitle: `Invoice-${inv?.order_no || inv?.invoice_no}`, 
    pageStyle: PAGE_STYLE 
  });
  const print3 = useReactToPrint({ 
    content: () => ref3.current, 
    documentTitle: `Invoice-${inv?.order_no || inv?.invoice_no}`, 
    pageStyle: PAGE_STYLE 
  });
  const print4 = useReactToPrint({ 
    content: () => ref4.current, 
    documentTitle: `Invoice-${inv?.order_no || inv?.invoice_no}`, 
    pageStyle: PAGE_STYLE 
  });
  const print5 = useReactToPrint({ 
    content: () => ref5.current, 
    documentTitle: `Invoice-${inv?.order_no || inv?.invoice_no}`, 
    pageStyle: PAGE_STYLE 
  });
  const print6 = useReactToPrint({ 
    content: () => ref6.current, 
    documentTitle: `Invoice-${inv?.order_no || inv?.invoice_no}`, 
    pageStyle: PAGE_STYLE 
  });

  const printMap: Record<TemplateId, () => void> = {
    1: print1, 2: print2, 3: print3, 4: print4, 5: print5, 6: print6,
  };

  const handlePrint = () => printMap[selectedTemplate]();

  const createPaymentMutation = useMutation({
    mutationFn: createSalesReceipt,
    onSuccess: () => {
      message.success("Payment recorded successfully");
      setPaymentModalOpen(false);
      paymentForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["sales-receipts-by-invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Failed to record payment");
    },
  });

  const handleRecordPayment = async (values: any) => {
    await createPaymentMutation.mutateAsync({
      customer_id: typeof inv.customer_id === "string" ? inv.customer_id : inv.customer_id?._id,
      receipt_date: values.receipt_date,
      lines: [{
        description: `Payment for invoice ${inv.order_no || inv.invoice_no}`,
        quantity: 1,
        unit_price: values.amount,
        vat_rate: 0,
        vat_type: "NONE",
      }],
      payment_method: values.payment_method,
      payment_reference: values.reference,
      payment_account_id: values.payment_account_id,
      revenue_account_id: values.revenue_account_id,
      notes: values.notes,
      status: "Posted",
      invoice_id: invoiceId,
    });
  };

  if (isLoading || !inv) {
    return (
      <Drawer
        title="Loading..."
        open={open}
        onClose={onClose}
        width={1000}
        destroyOnClose
      >
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: C.subText }}>Loading invoice details...</Text>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        destroyOnClose
        width={1000}
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
              <FilePdfOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>
              Invoice Details - {inv.order_no || inv.invoice_no}
            </Text>
            {inv.status && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: C.subText,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  padding: "1px 8px",
                }}
              >
                {inv.status}
              </span>
            )}
          </div>
        }
        extra={
          <Space>
            <Tooltip title="Record Payment">
              <Button
                icon={<DollarOutlined />}
                onClick={() => {
                  paymentForm.setFieldsValue({
                    receipt_date: new Date().toISOString().split('T')[0],
                    amount: inv.amount_due || inv.grand_total,
                  });
                  setPaymentModalOpen(true);
                }}
                style={{ borderRadius: 6 }}
              >
                Record Payment
              </Button>
            </Tooltip>
            <Tooltip title="Print / Save PDF">
              <Button
                type="primary"
                icon={<PrinterFilled />}
                onClick={handlePrint}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}
              >
                Print
              </Button>
            </Tooltip>
          </Space>
        }
      >
        {/* Template picker */}
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.subText,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "block",
              marginBottom: 8,
            }}
          >
            Choose invoice template
          </Text>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TEMPLATES.map((tpl) => (
              <TemplateThumbnail
                key={tpl.id}
                tpl={tpl}
                selected={selectedTemplate === tpl.id}
                onSelect={() => setSelectedTemplate(tpl.id as TemplateId)}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
          maxHeight: "calc(100vh - 280px)",
          overflowY: "auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          {([1, 2, 3, 4, 5, 6] as TemplateId[]).map((id) => {
            const Tpl = TEMPLATES[id - 1].component;
            return (
              <div key={id} style={{ display: id === selectedTemplate ? "block" : "none" }}>
                <Tpl ref={allRefs[id]} inv={inv} sys={sys} accentColor={primaryColor} />
              </div>
            );
          })}
        </div>

        {/* Linked Sales Receipts */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.subText,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              display: "block",
              marginBottom: 8,
            }}
          >
            Linked Sales Receipts ({linkedReceipts.length})
          </Text>
          {linkedReceipts.length === 0 ? (
            <Text style={{ color: C.subText, fontSize: 12 }}>No payments recorded yet</Text>
          ) : (
            <Table
              dataSource={linkedReceipts}
              columns={[
                {
                  title: "Receipt No",
                  dataIndex: "receipt_no",
                  key: "receipt_no",
                  render: (text: string) => <Text strong style={{ fontFamily: "monospace" }}>{text}</Text>,
                },
                {
                  title: "Date",
                  dataIndex: "receipt_date",
                  key: "receipt_date",
                  render: (date: string) => new Date(date).toLocaleDateString("en-GB"),
                },
                {
                  title: "Amount",
                  dataIndex: "grand_total",
                  key: "grand_total",
                  align: "right" as const,
                  render: (amount: number) => <Text strong>KES {amount.toLocaleString()}</Text>,
                },
                {
                  title: "Method",
                  dataIndex: "payment_method",
                  key: "payment_method",
                  render: (method: string) => <Tag>{method}</Tag>,
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (status: string) => (
                    <Tag color={status === "Posted" ? "success" : "warning"}>{status}</Tag>
                  ),
                },
              ]}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          )}
        </div>
      </Drawer>

      {/* Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={createPaymentMutation.isLoading}
        okText="Record Payment"
      >
        <Form form={paymentForm} layout="vertical" onFinish={handleRecordPayment}>
          <Form.Item
            name="amount"
            label="Payment Amount"
            rules={[{ required: true, message: "Required" }]}
            initialValue={inv?.amount_due || inv?.grand_total}
          >
            <Input type="number" prefix="KES" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item
            name="receipt_date"
            label="Payment Date"
            rules={[{ required: true, message: "Required" }]}
            initialValue={new Date().toISOString().split('T')[0]}
          >
            <Input type="date" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item
            name="payment_method"
            label="Payment Method"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select
              options={[
                { label: "Cash", value: "Cash" },
                { label: "M-Pesa", value: "M-Pesa" },
                { label: "Card", value: "Card" },
                { label: "Bank Transfer", value: "Bank_Transfer" },
                { label: "Cheque", value: "Cheque" },
              ]}
              style={{ borderRadius: 6 }}
            />
          </Form.Item>
          <Form.Item name="reference" label="Reference">
            <Input placeholder="Optional" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item
            name="payment_account_id"
            label="Payment Account"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select options={paymentAccountOptions} placeholder="Select cash/bank account" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" style={{ borderRadius: 6 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default InvoiceDetailDrawer;
